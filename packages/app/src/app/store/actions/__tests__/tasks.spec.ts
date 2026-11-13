import { produce } from "immer";

import { IPerson, ITask } from "@stacks/types";
import { TasksAPI } from "app/api";
import { TasksActions } from "app/store/actions";
import { TasksStore } from "app/store/tasks";
import { PeopleStore } from "app/store/people";

jest.mock("app/api", () => ({
    __esModule: true,
    default: jest.fn(),
    TasksAPI: { load: jest.fn() },
}));

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(res => {
        resolve = res;
    });
    return { promise, resolve };
};

const sameDate = new Date("2026-01-01T00:00:00.000Z");

const makeTask = (id: string, title = id, updated: Date | null = sameDate): ITask =>
    ({
        ...({} as ITask),
        id,
        title,
        project: "project-1",
        stack: "stack-1",
        updated,
    }) as ITask;

const setTask = (task: ITask) => {
    TasksStore.set(
        produce(state => {
            state.tasks = [task];
        })
    );
};

beforeEach(() => {
    jest.mocked(TasksAPI.load).mockReset();
    PeopleStore.set({
        ...PeopleStore.get(),
        me: "person-1",
        people: [{ id: "person-1" } as IPerson],
    });
    TasksStore.set({
        isLoading: false,
        loadingChunk: [],
        tasks: [],
        tasksById: new Map(),
        taskIdsByProject: new Map(),
        taskIdsByStack: new Map(),
        subtaskIdsByParent: new Map(),
        loadedProjects: [],
        isLoadingArchived: false,
    });
});

it("preserves unchanged task references when upserting", async () => {
    const task = makeTask("task-1");

    setTask(task);
    await TasksActions.upsertTasks([makeTask("task-1")]);

    expect(TasksStore.get().tasksById.get("task-1")).toBe(task);
});

it("replaces the task reference when upserted data changes", async () => {
    const task = makeTask("task-1", "Original");

    setTask(task);
    const changedTask = makeTask("task-1", "Updated");
    await TasksActions.upsertTasks([changedTask]);

    expect(TasksStore.get().tasksById.get("task-1")).toBe(changedTask);
});

it("clears requested task ids after a segment load fails", async () => {
    jest.mocked(TasksAPI.load).mockRejectedValueOnce(new Error("Request failed"));

    await expect(TasksActions.loadSegment(["missing-task"])).rejects.toThrow("Request failed");

    expect(TasksStore.get().loadingChunk).toEqual([]);
});

it("keeps the primary loading state until every task load finishes", async () => {
    const first = deferred<ITask[]>();
    const second = deferred<ITask[]>();
    jest.mocked(TasksAPI.load).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const firstLoad = TasksActions.loadMy();
    const secondLoad = TasksActions.loadMy();
    first.resolve([]);
    await firstLoad;
    const loadingAfterFirst = TasksStore.get().isLoading;
    second.resolve([]);
    await secondLoad;

    expect(loadingAfterFirst).toBe(true);
    expect(TasksStore.get().isLoading).toBe(false);
});

it("clears the primary loading state after a task load fails", async () => {
    jest.mocked(TasksAPI.load).mockRejectedValueOnce(new Error("Request failed"));

    await expect(TasksActions.loadMy()).rejects.toThrow("Request failed");

    expect(TasksStore.get().isLoading).toBe(false);
});

it("does not mark a project as loaded after its task request fails", async () => {
    jest.mocked(TasksAPI.load).mockRejectedValueOnce(new Error("Request failed"));

    await expect(TasksActions.loadByProject("project-1")).rejects.toThrow("Request failed");

    expect(TasksStore.get().loadedProjects).not.toContain("project-1");
    expect(TasksStore.get().isLoading).toBe(false);
});
