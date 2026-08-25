// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stacks/db", () => ({
    NotificationEntity: { create: vi.fn() },
}));

vi.mock("../context", () => ({
    getCurrentUser: () => ({ id: "creator-1", tenant: "tenant-1" }),
}));

const afterCommit = vi.fn();
vi.mock("../utils", () => ({
    afterTransactionCommit: (
        transaction: { afterCommit: (callback: () => void) => void },
        callback: () => void
    ) => transaction.afterCommit(callback),
    sanitizeWhere: (where: object) => where,
    withTransaction: async (_transaction: unknown, callback: (transaction: object) => unknown) =>
        callback({ afterCommit }),
}));

vi.mock("../../events", () => ({
    sendRealtimeUpdateToUser: vi.fn(),
}));

vi.mock("../../utils/cache", () => ({ invalidateApiCacheForCurrentRequest: vi.fn() }));

import { NotificationEntity } from "@stacks/db";
import { sendRealtimeUpdateToUser } from "../../events";
import { NotificationsLoader } from "../notifications";

describe("NotificationsLoader realtime delivery", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(NotificationEntity.create).mockResolvedValue({
            toJSON: () => ({ id: "notification-1" }),
        } as any);
    });

    it("emits the realtime event only after the notification transaction commits", async () => {
        await NotificationsLoader.add({
            recipient: "recipient-1",
            subject: "Review ready",
            message: "Review ready",
            recordType: "timelog" as any,
            data: [],
        });

        expect(sendRealtimeUpdateToUser).not.toHaveBeenCalled();
        expect(afterCommit).toHaveBeenCalledTimes(1);

        const callback = afterCommit.mock.calls[0][0];
        callback();

        expect(sendRealtimeUpdateToUser).toHaveBeenCalledWith(
            "recipient-1",
            expect.objectContaining({ record: "notification-1" })
        );
    });
});
