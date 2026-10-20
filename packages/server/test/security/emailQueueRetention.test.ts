// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { EmailQueueEntity, sequelize, UserEntity } from "@stacks/db";
import { EMAIL_TEMPLATES } from "@stacks/types";
import EmailService from "../../../email-service/src/services/EmailService";

const createdQueueIds: number[] = [];

afterEach(async () => {
    const ids = createdQueueIds.splice(0);
    if (ids.length > 0) {
        await EmailQueueEntity.destroy({ where: { id: ids }, force: true });
    }
});

describe("email queue terminal retention", () => {
    it("deletes only sent or failed rows older than 30 days", async () => {
        const user = await UserEntity.findOne({ where: { system: false } });
        expect(user).not.toBeNull();

        const now = Date.now();
        const old = new Date(now - 31 * 24 * 60 * 60 * 1000);
        const recent = new Date(now - 2 * 24 * 60 * 60 * 1000);
        const createRow = async (
            status: "sent" | "failed" | "pending",
            timestamps: { sentAt?: Date | null; updatedAt: Date }
        ) => {
            const row = await EmailQueueEntity.create({
                userId: String(user!.get("id")),
                template: EMAIL_TEMPLATES.PASSWORD_RESET,
                data: { resetToken: "sensitive-test-payload" },
                status,
                retryCount: 0,
                locale: "en",
                scheduledAt: recent,
                sentAt: timestamps.sentAt ?? null,
                created: old,
                updated: timestamps.updatedAt,
            } as any);
            const id = Number(row.get("id"));
            createdQueueIds.push(id);
            await sequelize.query(
                `UPDATE email_queue SET "created" = :created, "updated" = :updated WHERE id = :id`,
                { replacements: { id, created: old, updated: timestamps.updatedAt } }
            );
            return id;
        };

        const oldSent = await createRow("sent", { sentAt: old, updatedAt: recent });
        const oldFailed = await createRow("failed", { updatedAt: old });
        const recentSent = await createRow("sent", { sentAt: recent, updatedAt: recent });
        const recentFailed = await createRow("failed", { updatedAt: recent });
        const oldPending = await createRow("pending", { updatedAt: old });

        const service = new EmailService();
        await (service as any).cleanupExpiredQueueRows();

        const remaining = await EmailQueueEntity.findAll({
            where: { id: [oldSent, oldFailed, recentSent, recentFailed, oldPending] },
        });
        const remainingIds = remaining.map(row => Number(row.get("id")));
        expect(remainingIds).not.toContain(oldSent);
        expect(remainingIds).not.toContain(oldFailed);
        expect(remainingIds).toEqual(expect.arrayContaining([recentSent, recentFailed, oldPending]));
        const retainedPending = remaining.find(row => Number(row.get("id")) === oldPending);
        expect(retainedPending?.get("data")).toEqual({ resetToken: "sensitive-test-payload" });
    });
});
