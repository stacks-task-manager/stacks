// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { EmailQueueEntity, UserEntity } from "@stacks/db";
import { EMAIL_TEMPLATES } from "@stacks/types";
import { EmailsLoader } from "../../src/loaders/emails";

const createdQueueIds: number[] = [];

afterEach(async () => {
    const ids = createdQueueIds.splice(0);
    if (ids.length > 0) {
        await EmailQueueEntity.destroy({ where: { id: ids }, force: true });
    }
});

describe("email queue tenant binding", () => {
    it("rejects a non-system caller queueing mail to a user in another tenant", async () => {
        const caller = await UserEntity.findOne({ where: { system: false } });
        const systemRecipient = await UserEntity.findOne({ where: { system: true } });
        expect(caller).not.toBeNull();
        expect(systemRecipient).not.toBeNull();
        expect(String(caller!.get("tenant"))).not.toBe(String(systemRecipient!.get("tenant")));

        const recipientId = String(systemRecipient!.get("id"));
        const beforeIds = new Set(
            (await EmailQueueEntity.findAll({ where: { userId: recipientId }, attributes: ["id"] })).map(
                row => Number(row.get("id"))
            )
        );

        const queued = await EmailsLoader.queueEmail(
            recipientId,
            { firstName: "Test" },
            EMAIL_TEMPLATES.WELCOME,
            "en",
            caller!.toJSON() as any
        );

        const newRows = await EmailQueueEntity.findAll({
            where: { userId: recipientId },
            attributes: ["id"],
        });
        const newIds = newRows.map(row => Number(row.get("id"))).filter(id => !beforeIds.has(id));
        createdQueueIds.push(...newIds);

        expect(queued).toBe(false);
        expect(newIds).toHaveLength(0);
    });

    it("allows the system seeder and binds the queued template to the recipient tenant", async () => {
        const systemUser = await UserEntity.findOne({ where: { system: true } });
        const recipient = await UserEntity.findOne({ where: { system: false, admin: true } });
        expect(systemUser).not.toBeNull();
        expect(recipient).not.toBeNull();
        expect(String(systemUser!.get("tenant"))).not.toBe(String(recipient!.get("tenant")));

        const recipientId = String(recipient!.get("id"));
        const beforeIds = new Set(
            (await EmailQueueEntity.findAll({ where: { userId: recipientId }, attributes: ["id"] })).map(
                row => Number(row.get("id"))
            )
        );

        const queued = await EmailsLoader.queueEmail(
            recipientId,
            { firstName: "Test" },
            EMAIL_TEMPLATES.WELCOME,
            "en",
            systemUser!.toJSON() as any
        );

        expect(queued).toBe(true);
        const queuedRows = await EmailQueueEntity.findAll({
            where: { userId: recipientId, template: EMAIL_TEMPLATES.WELCOME },
            attributes: ["id", "userId"],
            order: [["created", "DESC"]],
        });
        const newRows = queuedRows.filter(row => !beforeIds.has(Number(row.get("id"))));
        createdQueueIds.push(...newRows.map(row => Number(row.get("id"))));
        expect(newRows).toHaveLength(1);
        expect(newRows[0].get("userId")).toBe(recipientId);
        expect(recipient!.get("tenant")).not.toBe(systemUser!.get("tenant"));
    });
});
