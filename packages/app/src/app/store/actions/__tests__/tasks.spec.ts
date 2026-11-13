import { produce } from "immer";

import { ITask } from "@stacks/types";
import { TasksActions } from "app/store/actions";
import { TasksStore } from "app/store/tasks";

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
