// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
jest.mock("../request", () => ({
    __esModule: true,
    default: { get: jest.fn() },
}));

import type { ITask } from "@stacks/types";
import request from "../request";
import { WorkbooksAPI } from "../workbooks";

const mockGet = request.get as jest.Mock;

describe("WorkbooksAPI.tasks", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("loads the workbook task set without a server-side query", async () => {
        const tasks = [{ id: "task-1" }] as ITask[];
        mockGet.mockResolvedValue(tasks);

        await expect(WorkbooksAPI.tasks("workbook-1")).resolves.toBe(tasks);
        expect(mockGet).toHaveBeenCalledWith("/api/workbooks/workbook-1/tasks");
    });
});
