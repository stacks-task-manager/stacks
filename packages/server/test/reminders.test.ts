// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { randomUUID } from "crypto";
import {
    DocumentEntity,
    PermissionEntity,
    ProjectEntity,
    StackEntity,
    TaskEntity,
    UserEntity,
} from "@stacks/db";
import { RECORDTYPE } from "@stacks/types";
import { readFileSync } from "node:fs";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Reminders API", () => {
    test("GET /api/reminders/:recordId - should require authentication", async () => {
        const res = await app.request(`/api/reminders/${randomUUID()}`);
        expect(res.status).toBe(401);
    });

    test("POST /api/reminders - should create and delete a reminder", async () => {
        const headers = await getAuthenticatedHeaders();
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const user = await UserEntity.findOne({ where: { email } });
        expect(user).not.toBeNull();
        const userId = String(user!.get("id"));
        const tenant = String(user!.get("tenant"));
        const projectId = randomUUID();
        const recordId = randomUUID();
        const stackId = randomUUID();
        await DocumentEntity.create({
            id: projectId,
            title: "Reminder API test project",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        await ProjectEntity.create({
            id: projectId,
            projectOwner: userId,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        await PermissionEntity.create({
            id: projectId,
            owner: userId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        await StackEntity.create({
            id: stackId,
            title: "Reminder API test stack",
            project: projectId,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        await TaskEntity.create({
            id: recordId,
            title: "Reminder API test task",
            project: projectId,
            stack: stackId,
            assignees: [userId],
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        await PermissionEntity.create({
            id: recordId,
            owner: userId,
            isPublic: false,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });

        const createRes = await app.request("/api/reminders", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                date: new Date().toISOString(),
                title: "Test reminder",
                subtitle: "Test subtitle",
                recordId,
                recordType: "task",
                url: "/task/test",
            }),
        });
        expect(createRes.status).toBe(200);
        const created = await createRes.json();
        expect(created.success).toBe(true);
        expect(created.data).toHaveProperty("id");
        const reminderId = created.data.id as string;

        const getRes = await app.request(`/api/reminders/${recordId}`, { headers });
        expect(getRes.status).toBe(200);
        const list = await getRes.json();
        expect(list.success).toBe(true);
        expect(Array.isArray(list.data)).toBe(true);
        expect(list.data.some((r: any) => r.id === reminderId)).toBe(true);

        const deleteRes = await app.request(`/api/reminders/${reminderId}`, {
            method: "DELETE",
            headers,
        });
        expect(deleteRes.status).toBe(200);

        const verifyRes = await app.request(`/api/reminders/${recordId}`, { headers });
        expect(verifyRes.status).toBe(200);
        const verified = await verifyRes.json();
        expect(verified.success).toBe(true);
        expect(Array.isArray(verified.data)).toBe(true);
        expect(verified.data.some((r: any) => r.id === reminderId)).toBe(false);

        await TaskEntity.destroy({ where: { id: recordId }, force: true });
        await StackEntity.destroy({ where: { id: stackId }, force: true });
        await PermissionEntity.destroy({ where: { id: [recordId, projectId] }, force: true });
        await ProjectEntity.destroy({ where: { id: projectId }, force: true });
        await DocumentEntity.destroy({ where: { id: projectId }, force: true });
    });
});
