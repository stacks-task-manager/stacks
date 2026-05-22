// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * URL hash navigation, stack/task focus, keyboard shortcuts.
 */
import { produce } from "immer";
import { ExtendedKeyboardEvent } from "mousetrap";

import { IStack, ITask } from "@stacks/types";
import {
    getCurrentProjectId,
    getProjectStatuses,
    getProjectTags,
    getStacks,
    getStackTasks,
    getStackTasksIds,
    getSubtasks,
} from "app/hooks";
import { entity } from "app/hooks/store";
import { setClipboard } from "app/utils/browser";
import { formatDate } from "app/utils/date";
import { scrollIntoView } from "app/utils/dom";
import Toast from "app/utils/toast";
import { StacksActions } from "./actions";
import { PreferencesStore } from "./preferences";
import { TasksStore } from "./tasks";

interface INavigationStore {
    index?: [number, number];
    tasks: string[];
    stack?: string;
}

export const NavigationStore = entity<INavigationStore>({
    tasks: [],
});

const focusBoard = () => {
    const board = document.getElementById("stacks");
    if (board) board.focus();
};

const equalsIgnoreOrder = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const uniqueValues = new Set([...a, ...b]);
    for (const v of uniqueValues) {
        const aCount = a.filter(e => e === v).length;
        const bCount = b.filter(e => e === v).length;
        if (aCount !== bCount) return false;
    }
    return true;
};

const update = (stck: string | undefined, tsks: string[]) => {
    const { stack, tasks } = NavigationStore.get();
    if (stck === stack && equalsIgnoreOrder(tsks, tasks)) return;

    NavigationStore.set(
        produce((state: INavigationStore) => {
            state.stack = stck;
            state.tasks = tsks;
        })
    );

    if (tsks.length > 0) {
        // const [firstTask] = tsks;
        const lastTask = [...tsks].pop();
        const taskElement = document.getElementById(`task-${lastTask}`);

        if (taskElement) {
            scrollIntoView(taskElement, {
                behavior: "smooth",
            });
        } else {
            const stackElement = document.getElementById(`stack-${stck}`);
            scrollIntoView(stackElement, {
                behavior: "smooth",
            });
        }
    } else {
        const stackElement = document.getElementById(`stack-${stck}`);
        if (stackElement) {
            stackElement.scrollIntoView({
                behavior: "smooth",
            });
        }
    }
};

/* NAVIGATION */
export const navigateNextStack = (event: ExtendedKeyboardEvent) => {
    event.preventDefault();

    const highlightTask = PreferencesStore.get().highlightTask;
    const highlightStack = PreferencesStore.get().highlightStack;
    if (!highlightTask && !highlightStack) return;

    const stacks = getStacks();

    const { tasks, stack } = NavigationStore.get();
    const visibleTasks = TasksStore.get().tasks.map(task => task.id);

    let stackIndex = stack ? stacks.findIndex(s => s.id === stack) : 0;

    const currentStack: IStack = stacks[stackIndex];
    if (stack) {
        if (stackIndex + 1 <= stacks.length - 1) {
            stackIndex++;
        }
    }
    const nextStack: IStack = stacks[stackIndex];
    // in case this project is empty
    if (!nextStack) return;

    focusBoard();

    if (!getStackTasks(nextStack.id).length) {
        update(nextStack.id, []);
        return;
    }

    const [firstTask] = tasks;
    const currentStackTasks = getStackTasksIds(currentStack.id).filter(taskId =>
        visibleTasks.includes(taskId)
    );
    const nextStackTasks = getStackTasksIds(nextStack.id).filter(taskId => visibleTasks.includes(taskId));

    let currentTaskIndex = firstTask ? currentStackTasks.findIndex(taskId => taskId === firstTask) : 0;
    if (currentTaskIndex === -1) currentTaskIndex = 0;

    if (firstTask) {
        if (currentTaskIndex > nextStackTasks.length - 1) {
            currentTaskIndex = nextStackTasks.length - 1;
        }
    }

    update(
        highlightStack ? nextStack.id : undefined,
        nextStackTasks.length && highlightTask ? [nextStackTasks[currentTaskIndex]] : []
    );
};

export const navigatePrevStack = (event: ExtendedKeyboardEvent) => {
    event.preventDefault();

    const highlightTask = PreferencesStore.get().highlightTask;
    const highlightStack = PreferencesStore.get().highlightStack;
    if (!highlightTask && !highlightStack) return;

    const { tasks, stack } = NavigationStore.get();
    const visibleTasks = TasksStore.get().tasks.map(task => task.id);

    const stacks = getStacks();
    focusBoard();

    let stackIndex = stack ? stacks.findIndex(s => s.id === stack) : 0;
    const currentStack: IStack = stacks[stackIndex];
    if (stack) {
        if (stackIndex - 1 >= 0) {
            stackIndex--;
        }
    }
    const nextStack: IStack = stacks[stackIndex];
    // in case the stack is missing because the project is empty
    if (!nextStack) return;
    const [firstTask] = tasks;

    const currentStackTasks = getStackTasksIds(currentStack.id).filter(taskId =>
        visibleTasks.includes(taskId)
    );
    const nextStackTasks = getStackTasksIds(nextStack.id).filter(taskId => visibleTasks.includes(taskId));

    let currentTaskIndex = firstTask ? currentStackTasks.findIndex(taskId => taskId === firstTask) : 0;
    if (currentTaskIndex === -1) currentTaskIndex = 0;
    if (firstTask) {
        if (currentTaskIndex > nextStackTasks.length - 1) {
            currentTaskIndex = nextStackTasks.length - 1;
        }
    }

    update(
        highlightStack ? nextStack.id : undefined,
        nextStackTasks.length && highlightTask ? [nextStackTasks[currentTaskIndex]] : []
    );
};

const toggleTask = (tasks: string[], taskId: string) => {
    if (tasks.includes(taskId)) {
        const index = tasks.indexOf(taskId);

        if (index < tasks.length - 1) {
            return tasks.filter((t, i) => i < index + 1);
        }

        return tasks.filter(t => t !== taskId);
    }

    return [...tasks, taskId];
};

export const navigateNextTask = async (
    event: ExtendedKeyboardEvent | React.KeyboardEvent | React.MouseEvent
) => {
    event.preventDefault();

    const highlightTask = PreferencesStore.get().highlightTask;
    const highlightStack = PreferencesStore.get().highlightStack;
    if (!highlightTask) return;

    const visibleTasks = TasksStore.get().tasks.map(task => task.id);

    const stacks = getStacks();
    const { tasks, stack } = NavigationStore.get();

    let stackIndex = stack ? stacks.findIndex(s => s.id === stack) : null;
    const lastTask = [...tasks].pop() ?? visibleTasks.at(0);

    // if the stack is not defined
    // grab it from the last selected task
    if (!stackIndex) {
        if (lastTask) {
            const taskStack = await StacksActions.getStackByTask(lastTask);
            stackIndex = taskStack ? stacks.findIndex(s => s.id === taskStack.id) : 0;
        } else {
            stackIndex = 0;
        }
    }

    let currentStack: IStack = stacks[stackIndex];

    // task not found maybe project has not stacks?
    if (!lastTask) return;
    let stackTasks = getStackTasksIds(currentStack.id).filter(taskId => visibleTasks.includes(taskId));
    let taskIndex = stackTasks.findIndex(taskId => taskId === lastTask);

    if (taskIndex + 1 > stackTasks.length - 1) {
        if (stackIndex !== stacks.length - 1) {
            taskIndex = 0;
        }
        if (stackIndex + 1 <= stacks.length - 1) {
            stackIndex++;
        }
    } else {
        taskIndex++;
    }

    currentStack = stacks[stackIndex];

    stackTasks = getStackTasksIds(currentStack.id).filter(taskId => visibleTasks.includes(taskId));

    if (!stackTasks.length) return;

    focusBoard();
    if (event.shiftKey) {
        update(
            highlightStack ? currentStack.id : undefined,
            highlightTask ? toggleTask(tasks, stackTasks[taskIndex]) : []
        );
    } else {
        update(highlightStack ? currentStack.id : undefined, highlightTask ? [stackTasks[taskIndex]] : []);
    }
};

export const navigatePrevTask = async (
    event: ExtendedKeyboardEvent | React.KeyboardEvent | React.MouseEvent
) => {
    event.preventDefault();

    const highlightTask = PreferencesStore.get().highlightTask;
    const highlightStack = PreferencesStore.get().highlightStack;
    if (!highlightTask) return;

    const { tasks, stack } = NavigationStore.get();
    const visibleTasks = TasksStore.get().tasks.map(task => task.id);

    const stacks = getStacks();
    let stackIndex = stack ? stacks.findIndex(s => s.id === stack) : 0;

    // if the stack is not defined
    // grab it from the last selected task
    if (!stackIndex) {
        const lastTask = [...tasks].pop();
        if (lastTask) {
            const taskStack = await StacksActions.getStackByTask(lastTask);
            stackIndex = taskStack ? stacks.findIndex(s => s.id === taskStack.id) : 0;
        } else {
            stackIndex = 0;
        }
    }

    let currentStack: IStack | undefined = stacks[stackIndex];
    const lastTask =
        [...tasks].pop() ?? getStackTasksIds(currentStack.id).find(taskId => visibleTasks.includes(taskId));

    // task not found maybe project has not stacks?
    if (!lastTask) return;

    let stackTasks = getStackTasksIds(currentStack.id).filter(taskId => visibleTasks.includes(taskId));
    let taskIndex = stackTasks.findIndex(taskId => taskId === lastTask);

    if (taskIndex - 1 >= 0) {
        taskIndex--;
    } else if (stackIndex - 1 >= 0) {
        stackIndex--;
        stackTasks = getStackTasksIds(stacks[stackIndex].id).filter(taskId => visibleTasks.includes(taskId));
        taskIndex = stackTasks.length - 1;
    }

    currentStack = stacks[stackIndex];
    focusBoard();

    if (event.shiftKey) {
        update(
            highlightStack ? currentStack.id : undefined,
            highlightTask ? toggleTask(tasks, stackTasks[taskIndex]) : []
        );
    } else {
        update(highlightStack ? currentStack?.id : undefined, highlightTask ? [stackTasks[taskIndex]] : []);
    }
};

export const setSelection = (stck: string, task?: string, append?: boolean) => {
    const { stack, tasks } = NavigationStore.get();
    if (stck && !task && stck === stack) return;
    if (stck === stack && equalsIgnoreOrder([task!], tasks)) return;

    NavigationStore.set(
        produce((state: INavigationStore) => {
            state.stack = stck;

            if (task) {
                if (append) {
                    if (state.tasks.includes(task)) {
                        state.tasks = state.tasks.filter(t => t !== task);
                    } else {
                        state.tasks.push(task);
                    }
                } else {
                    state.tasks = [task];
                }
            }
        })
    );
};

export const cancelSelection = () => {
    const { stack, tasks } = NavigationStore.get();
    if (!stack && !tasks.length) return;
    update(undefined, []);
};

const formatTask = async (task: ITask, format = "{{title}}", separator = ", ") => {
    let text = format;
    const projectId = getCurrentProjectId();

    const tags = getProjectTags(projectId);
    const statuses = getProjectStatuses(projectId);

    text = text.replace(/\{\{title\}\}/gim, task.title);
    text = text.replace(/\{\{description\}\}/gim, task.description);
    text = text.replace(/\{\{completeState\}\}/gim, task.done ? "✔" : "☐");

    if (task.assignees) {
        // TODO: fix this since the task only contains the assignee id
        // const taskAssignees = task.assignees.map(a => `@${a.name}`);
        // text = text.replace(/\{\{assignees\}\}/gim, taskAssignees.join(separator));
    } else {
        text = text.replace(/\{\{assignees\}\}/gim, "");
    }

    if (task.status) {
        const status = statuses.find(s => s.id === task.status);
        if (status) {
            text = text.replace(/\{\{status\}\}/gim, status.title);
        }
    } else {
        text = text.replace(/\{\{status\}\}/gim, "");
    }

    if (task.tags) {
        const taskTags = tags.filter(t => task.tags!.includes(t.id)).map(t => `#${t.title}`);
        text = text.replace(/\{\{tags\}\}/gim, taskTags.join(separator));
    } else {
        text = text.replace(/\{\{tags\}\}/gim, "");
    }

    if (task.duedate) {
        const dueDate = task.duedate;
        text = text.replace(/\{\{dueDate\}\}/gim, formatDate(dueDate, dueDate!.allDay ? "Pp" : "PPp"));
    } else {
        text = text.replace(/\{\{dueDate\}\}/gim, "");
    }

    if (task.startdate) {
        const startDate = task.startdate;
        text = text.replace(/\{\{startDate\}\}/gim, formatDate(startDate, startDate!.allDay ? "Pp" : "PPp"));
    } else {
        text = text.replace(/\{\{startDate\}\}/gim, "");
    }

    if (task.progress) {
        text = text.replace(/\{\{progress\}\}/gim, `${task.progress}`);
    } else {
        text = text.replace(/\{\{progress\}\}/gim, "");
    }

    if (task.priority) {
        text = text.replace(/\{\{priority\}\}/gim, task.priority);
    } else {
        text = text.replace(/\{\{priority\}\}/gim, "");
    }

    const subtasks = getSubtasks(task.id);
    if (subtasks.length) {
        let subtasktext = `\nSubtasks (${subtasks.length}):\n`;
        for (const subtask of subtasks) {
            subtasktext += `- [${subtask.done ? "x" : " "}] ${subtask.title}\n`;
        }
        text = text.replace(/\{\{subtasks\}\}/gim, subtasktext);
    } else {
        text = text.replace(/\{\{subtasks\}\}/gim, "");
    }

    // if (task.estimate) {
    //     text = text.replace(/\{\{estimated\}\}/gim, task.estimate);
    // } else {
    //     text = text.replace(/\{\{estimated\}\}/gim, "");
    // }

    // if (task.spent) {
    //     text = text.replace(/\{\{spent\}\}/gim, task.spent);
    // } else {
    //     text = text.replace(/\{\{spent\}\}/gim, "");
    // }

    text = text.replace(/\{\{nl\}\}/gim, "\n");

    return text;
};

export const copyTasks = async (tasks: ITask[]) => {
    const preferences = PreferencesStore.get();
    const selectedTasks = await Promise.all(
        tasks.map(async t => await formatTask(t, preferences.taskCopyFormat, preferences.taskFormatSeparator))
    );
    if (!selectedTasks.length) return;

    setClipboard(selectedTasks.join("\n\n"));
    Toast.success(`Copied to clipboard (${selectedTasks.length})`, "clipboard");
};

export const copySelection = () => {
    const { tasks } = NavigationStore.get();
    if (!tasks.length) return;
    const selectedTasks: ITask[] = TasksStore.get().tasks.filter(task => tasks.includes(task.id));
    copyTasks(selectedTasks);
};
