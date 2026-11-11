// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { produce } from "immer";

import { ITask } from "@stacks/types";
import { ITasksStore, TasksStore, orderTasksWithFallback } from "app/store/tasks";

const makeTask = (id: string, title = id): ITask =>
    ({
        ...({} as ITask),
        id,
        title,
        description: "",
        project: "project-1",
        stack: "stack-1",
    } as ITask);

const resetStore = () => {
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
};

beforeEach(resetStore);

it("keeps tasksById synchronized for direct replacements", () => {
    const first = makeTask("first");
    const second = makeTask("second");

    TasksStore.set({ ...TasksStore.get(), tasks: [first, second] });

    expect(TasksStore.get().tasksById.get("first")).toBe(first);
    expect(TasksStore.get().tasksById.get("second")).toBe(second);
    expect(TasksStore.get().tasksById.size).toBe(2);
});

it("reindexes updated and removed tasks", () => {
    const first = makeTask("first", "Original");
    const second = makeTask("second");

    TasksStore.set({ ...TasksStore.get(), tasks: [first, second] });
    TasksStore.set(
        produce((state: ITasksStore) => {
            state.tasks = [makeTask("first", "Updated")];
        })
    );

    expect(TasksStore.get().tasksById.get("first")?.title).toBe("Updated");
    expect(TasksStore.get().tasksById.has("second")).toBe(false);
    expect(TasksStore.get().tasksById.size).toBe(1);
});

it("builds reverse indexes used by project, stack, and subtask selectors", () => {
    const parent = makeTask("parent");
    const child = makeTask("child");
    child.parent = parent.id;
    const other = makeTask("other");
    other.project = "project-2";
    other.stack = "stack-2";

    TasksStore.set({ ...TasksStore.get(), tasks: [parent, child, other] });

    expect(TasksStore.get().taskIdsByProject.get("project-1")).toEqual(["parent", "child"]);
    expect(TasksStore.get().taskIdsByStack.get("stack-1")).toEqual(["parent", "child"]);
    expect(TasksStore.get().subtaskIdsByParent.get("parent")).toEqual(["child"]);
});

it("reuses the indexes when only non-task state changes", () => {
    TasksStore.set({ ...TasksStore.get(), tasks: [makeTask("first")] });
    const indexes = {
        tasksById: TasksStore.get().tasksById,
        taskIdsByProject: TasksStore.get().taskIdsByProject,
        taskIdsByStack: TasksStore.get().taskIdsByStack,
        subtaskIdsByParent: TasksStore.get().subtaskIdsByParent,
    };

    TasksStore.set(
        produce((state: ITasksStore) => {
            state.isLoading = true;
        })
    );

    expect(TasksStore.get().tasksById).toBe(indexes.tasksById);
    expect(TasksStore.get().taskIdsByProject).toBe(indexes.taskIdsByProject);
    expect(TasksStore.get().taskIdsByStack).toBe(indexes.taskIdsByStack);
    expect(TasksStore.get().subtaskIdsByParent).toBe(indexes.subtaskIdsByParent);
});

it("appends indexed fallback ids when an explicit order is incomplete", () => {
    const first = makeTask("first");
    const second = makeTask("second");
    const third = makeTask("third");
    const tasksById = new Map([first, second, third].map(task => [task.id, task]));

    expect(orderTasksWithFallback(tasksById, ["third"], ["second", "third", "first"])).toEqual([
        third,
        second,
        first,
    ]);
});
