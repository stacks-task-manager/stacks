// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes } from "@blueprintjs/core";
import { Plus } from "@blueprintjs/icons";
import classNames from "classnames";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";

import { ITask } from "@stacks/types";
import { Container, Draggable } from "app/components/draggable";
import { LazyLoad } from "app/components/common";
import { TaskCard } from "app/components/project";
import {
    getStack,
    useFilteredProjectTasksIds,
    usePreferences,
    useSortTaskIds,
    useStackInfo,
    useSubscribe
} from "app/hooks";
import { StacksActions, TasksActions } from "app/store/actions";
import { PreferencesStore } from "app/store/preferences";
import { NewTaskPopup } from "app/widgets";
import { StackHeader } from "./StackHeader/StackHeader";
import { StackSelected } from "./StackSelected";

interface ITasksProps {
    tasks: string[];
    stackId: string;
    hasBackground?: boolean;
}

const TasksPure: FunctionComponent<ITasksProps> = ({ tasks, stackId, hasBackground }) => {
    const colRef = useRef<HTMLDivElement | null>(null);
    const filteredTasks = useSortTaskIds(useFilteredProjectTasksIds(tasks), stackId);

    const handleScroll = () => {
        if (colRef.current == null) return;
        const scrollEl = document.getElementById(`stack-column-${stackId}`);
        if (scrollEl == null) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollEl;

        if (scrollTop > 0) {
            colRef.current.classList.add("has-top-shadow");
        } else {
            colRef.current.classList.remove("has-top-shadow");
        }

        if (scrollTop + clientHeight < scrollHeight) {
            colRef.current.classList.add("has-bottom-shadow");
        } else {
            colRef.current.classList.remove("has-bottom-shadow");
        }
    };

    useEffect(() => {
        setTimeout(handleScroll, 1000);
    }, []);

    useSubscribe("task:updated", updatedTask => {
        if (tasks.includes(updatedTask.id)) {
            const stack = getStack(stackId);
            if (!stack) return;
            if (!stack.sorting) return;
            StacksActions.orderTasks(stackId, stack.sorting);
        }
    });

    useSubscribe("task:created", ({ newTaskId: _newTaskId }) => {
        // Auto-re-ordering on remote task creation is intentionally a no-op for now;
        // tasks are added via the normal action flow which already handles sorting.
    });

    const memoizedTasks = useMemo(() => {
        const lazyLoadTasks = PreferencesStore.get().taskLazyLoad;

        return filteredTasks.map((taskId, i) => {
            return (
                <TaskCard
                    key={taskId}
                    taskId={taskId}
                    stackId={stackId}
                    initialVisible={i < 10 || !lazyLoadTasks}
                />
            );
        });
    }, [filteredTasks, stackId]);

    const handleReorder = ({
        itemId,
        fromIndex,
        toIndex,
    }: {
        itemId: string;
        fromIndex: number;
        toIndex: number;
    }) => {
        if (fromIndex === toIndex) return;
        TasksActions.moveTaskWithinStack(itemId, stackId, fromIndex, toIndex);
    };

    const handleItemMove = ({
        itemId,
        fromContainerId,
        toContainerId,
        fromIndex,
        toIndex,
    }: {
        itemId: string;
        fromContainerId: string;
        toContainerId: string;
        fromIndex: number;
        toIndex: number;
    }) => {
        if (!fromContainerId.startsWith("stack-column-") || !toContainerId.startsWith("stack-column-")) {
            return;
        }
        const fromStack = fromContainerId.replace(/^stack-column-/, "");
        const toStack = toContainerId.replace(/^stack-column-/, "");
        TasksActions.moveTaskBetweenStacks(itemId, fromStack, toStack, fromIndex, toIndex);
    };

    return (
        <div
            className={classNames("scroller-parent", {
                "has-background": hasBackground,
            })}
            ref={colRef}
        >
            <Container
                id={`stack-column-${stackId}`}
                type="board-task"
                direction="vertical"
                className="scroller thin auto"
                style={{ flexGrow: 1 }}
                onReorder={handleReorder}
                onItemMove={handleItemMove}
                onScroll={handleScroll}
                data-testid="column-tasks-wrapper"
            >
                {memoizedTasks}
            </Container>
        </div>
    );
};
export const Tasks = React.memo(TasksPure);

// interface IEmptyFilteredStackProps {
//     isDraggingOver: boolean;
// }
// const EmptyFilteredStack: FunctionComponent<IEmptyFilteredStackProps> = ({ isDraggingOver }) => {
//     return (
//         <div className="stack-empty">
//             {!isDraggingOver && <img src={FilteredTaskIcon} alt="" />}
//             {isDraggingOver && <img src={DropTaskIcon} alt="" />}
//             {!isDraggingOver && (
//                 <p>
//                     The applied filters do not
//                     <br />
//                     match any task in this stack
//                 </p>
//             )}
//             {isDraggingOver && <p>Drop the task here</p>}
//         </div>
//     );
// };

// interface IEmptyStackProps {
//     isDraggingOver: boolean;
//     canAdd: boolean;
//     onClick: () => void;
// }

// const EmptyStack: FunctionComponent<IEmptyStackProps> = ({ isDraggingOver, canAdd, onClick }) => {
//     return (
//         <div className="stack-empty interractive" onClick={canAdd ? onClick : undefined}>
//             {!isDraggingOver && <img src={NoTasksIcon} alt="" />}
//             {isDraggingOver && <img src={DropTaskIcon} alt="" />}
//             {!isDraggingOver && (
//                 <p>
//                     {translate("This stack is empty")}
//                     <br />
//                     {canAdd && {translate("Click here to add a task now")}}
//                 </p>
//             )}
//             {isDraggingOver && <p>Drop the task here</p>}
//         </div>
//     );
// };

// interface IAddListProps {
//     stackIndex: number;
//     type: "column";
// }

// const AddList: FunctionComponent<IAddListProps> = ({ stackIndex, type }) => {
//     if (type === "column") {
//         return null;
//     }

//     return (
//         <div className="stack-add-here" onClick={() => StacksActions.addNew(stackIndex + 1)}>
//             <div>
//                 {translate("Add tasklist here")}
//             </div>
//         </div>
//     );
// };

export interface IStackProps {
    stackId: string;
    stackIndex: number;
}

const StackPure: FunctionComponent<IStackProps> = ({ stackIndex, stackId }) => {
    const [showNew, setShowNew] = useState(false);
    const [showNewTop, setShowNewTop] = useState(false);
    const { showLargeStacks, stackLazyLoad, stacksBackground } = usePreferences([
        "showLargeStacks",
        "stackLazyLoad",
        "stacksBackground",
    ]);
    const stackInfo = useStackInfo(stackId);

    if (!stackInfo) return null;

    const { collapsed, empty, tasks } = stackInfo;
    const taskIds = tasks.map(task => task.id);

    const handleShowNewTask = (top: boolean) => {
        if (showNewTop !== top) {
            setShowNewTop(top);
        }
        setShowNew(true);
    };

    // const handleSelect = (event: React.MouseEvent) => {
    //     if (event.defaultPrevented) return;
    //     event.stopPropagation();
    //     setSelection(stackId, undefined);
    // };

    const handleHideNewTask = (newTasks?: ITask[]) => {
        setShowNew(false);
        // in case we're adding the task to the bottom
        // it should scroll to the bottom
        if (newTasks?.length && !showNewTop) {
            scrolltoBottom(stackId);
        }
    };

    const stack = (
        <LazyLoad
            stayRendered
            initialVisible={stackIndex < 3 || !stackLazyLoad}
            threshold={0.2}
            root={document.getElementById("stacks")}
            loadingElement={<StackLoading length={tasks.length} />}
            className={classNames("stack", {
                collapsed,
                larger: showLargeStacks,
            })}
            id={`stack-${stackId}`}
            data-testid="board-column"
        // onClick={handleSelect}
        >
            <StackSelected stackId={stackId} />
            <StackHeader
                stackId={stackId}
                index={stackIndex}
                isCollapsed={collapsed}
                onShowNew={() => handleShowNewTask(true)}
            />

            {collapsed ? null : (
                <Tasks tasks={taskIds} stackId={stackId} hasBackground={stacksBackground} />
            )}

            <div className="new-task">
                <Button
                    size="small"
                    variant="minimal"
                    fill
                    icon={<Plus />}
                    id={`new-task-bottom-${stackId}`}
                    onClick={() => handleShowNewTask(false)}
                    data-testid="column-add-task-button"
                >
                    {translate("Add task")}
                </Button>
            </div>
            {showNew && (
                <NewTaskPopup defaultStack={stackId} top={showNewTop} onClose={handleHideNewTask} />
            )}
        </LazyLoad>
    );

    return (
        <Draggable id={stackId} type="stack" containerId="stacks" handleClassName="draggable-stack">
            {stack}
        </Draggable>
    );
};

export const Stack = React.memo(StackPure);

interface IStackLoadingProps {
    length: number;
}
const StackLoading: FunctionComponent<IStackLoadingProps> = ({ length }) => {
    return (
        <>
            <div className={classNames("stack-header", Classes.SKELETON)} />
            {/* <div className={classNames("stack-content", Classes.SKELETON)} style={{ height: 50000 }}> */}
            <div className="stack-content">
                {Array.from({ length: length > 15 ? 15 : length }, (v, i) => i).map((a, i) => {
                    return (
                        <div
                            key={i}
                            className={classNames("task-card", Classes.SKELETON)}
                            style={{ height: 60, marginBottom: 10 }}
                        />
                    );
                })}
            </div>
            {length === 0 && <button className={Classes.SKELETON}>Add task</button>}
        </>
    );
};

const scrolltoBottom = (stackId: string, done?: boolean) => {
    const stackEl = document.getElementById(`stack-${stackId}`);
    if (!stackEl) return;

    const containerEl = stackEl.querySelector(".container[data-direction='vertical']");
    if (!containerEl) return;

    containerEl.scrollTop = containerEl.scrollHeight;

    setTimeout(() => {
        if (!done) {
            scrolltoBottom(stackId, true);
        }
    }, 200);
};
