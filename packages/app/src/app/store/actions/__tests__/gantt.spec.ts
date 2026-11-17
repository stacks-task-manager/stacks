import type { ITask } from "@stacks/types";
import { TasksAPI } from "app/api";
import { TasksActions } from "app/store/actions/tasks";
import { rescheduleGanttTask } from "app/store/actions/gantt";

jest.mock("app/api", () => ({ TasksAPI: { update: jest.fn() } }));
jest.mock("app/store/actions/tasks", () => ({ TasksActions: { update: jest.fn() } }));

const dates = { startDate: new Date(2026, 9, 27), endDate: new Date(2026, 9, 28, 23, 59, 59) };

beforeEach(() => jest.clearAllMocks());
it("retains persisted store dates until the API confirms a save", async () => {
    let confirm!: () => void;
    jest.mocked(TasksAPI.update).mockImplementationOnce(
        () =>
            new Promise(resolve => {
                confirm = () => resolve({} as ITask);
            })
    );
    const saving = rescheduleGanttTask("task", dates);
    expect(TasksActions.update).not.toHaveBeenCalled();
    confirm();
    await saving;
    expect(TasksActions.update).toHaveBeenCalledWith(
        "task",
        { startdate: dates.startDate, duedate: dates.endDate },
        true
    );
});
it("does not mutate the store when saving fails", async () => {
    jest.mocked(TasksAPI.update).mockRejectedValueOnce(new Error("request rejected"));
    await expect(rescheduleGanttTask("task", dates)).rejects.toThrow("request rejected");
    expect(TasksActions.update).not.toHaveBeenCalled();
});
