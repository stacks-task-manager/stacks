import { describe, expect, it } from "vitest";
import { TaskUpdateSchema } from "../schema/task";

const statusId = "11111111-1111-4111-8111-111111111111";

describe("task route schemas", () => {
    it("accepts clearing a task status", () => {
        expect(TaskUpdateSchema.safeParse({ status: null }).success).toBe(true);
    });

    it("accepts a task status id", () => {
        expect(TaskUpdateSchema.safeParse({ status: statusId }).success).toBe(true);
    });
});
