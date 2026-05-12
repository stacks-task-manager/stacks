// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Panel-stack dialog: pick project, then stack, then task. Prefer `TaskPicker` when selecting within one project only. */
import { Button, Classes, Colors, Dialog, InputGroup, Menu, MenuItem, Panel, PanelProps, PanelStack } from "@blueprintjs/core";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";

import { APPICONS, IStack, ITask, PRIORITY, TreeNode } from "@stacks/types";
import { BlankSlate, Grid, Icon, Row, Scroller } from "app/components/common";
import { PriorityChip, TaskState } from "app/components/project";
import { useProjectDocuments, useProjectStacks, useStack, useStackInfo, useStackTasks, useTask } from "app/hooks";
import { ProjectsActions, TasksActions } from "app/store/actions";
import { TaskAssignees } from "../TaskAssignees/TaskAssignees";

interface TaskPickerProps {
    onSelect: (taskId: string) => void;
    onFilter?: (tasks: ITask[]) => ITask[];
}

const ProjectsPanel: React.FC<PanelProps<TaskPickerProps>> = props => {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const projects = useProjectDocuments();

    const filteredProjects = useMemo(() => {
        if (query.length === 0) return projects;
        return projects.filter(project => project.title.toLowerCase().includes(query.toLowerCase()));
    }, [query, projects]);

    useEffect(() => {
        if (selectedIndex !== -1) {
            const project = filteredProjects[selectedIndex];
            if (project) {
                document.getElementById(`project-${project.id}`)?.scrollIntoView({ block: "center" });
            }
        }
    }, [selectedIndex, filteredProjects]);

    const handleChangeQuery = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setSelectedIndex(-1);
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            setSelectedIndex(Math.min(selectedIndex + 1, filteredProjects.length - 1));
        } else if (e.key === "ArrowUp") {
            setSelectedIndex(Math.max(selectedIndex - 1, -1));
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0) {
                handleSelectProject(filteredProjects[selectedIndex]);
            }
        }
    }

    const handleSelectProject = useCallback(async (project: TreeNode) => {
        await ProjectsActions.load([project.id], { silent: true });
        await TasksActions.loadByProject(project.id);
        props.openPanel({
            props: {
                projectId: project.id,
                onSelect: props.onSelect,
                onFilter: props.onFilter
            },
            renderPanel: StacksPanel,
            title: project.title,
        })
    }, [props.onSelect]);

    return (
        <Grid gap={10} vertical>
            <InputGroup
                placeholder="Search project"
                autoFocus
                leftIcon={<Icon icon="search" />}
                round
                onChange={handleChangeQuery}
                onKeyDown={handleKeyDown}
            />
            {filteredProjects.length ? (
                <Scroller vertical>
                    <Menu size="large">
                        {filteredProjects.map(project => (
                            <MenuItem
                                id={`project-${project.id}`}
                                icon={<Icon icon={APPICONS.PROJECT} />}
                                key={project.id}
                                text={project.title}
                                active={selectedIndex === filteredProjects.indexOf(project)}
                                labelElement={<Icon icon="chevron-right" />}
                                onClick={() => handleSelectProject(project)}
                            />
                        ))}
                    </Menu>
                </Scroller>
            ) : (
                <Grid vertical>
                    <BlankSlate icon={APPICONS.SEARCH} title="No projects found" description="Try entering a different search query." />
                </Grid>
            )}
        </Grid>
    );
};

interface StacksPanelInfo extends TaskPickerProps {
    projectId: string,
}

const StacksPanel: React.FC<PanelProps<StacksPanelInfo>> = props => {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const stacks = useProjectStacks(props.projectId);

    const filteredStacks = useMemo(() => {
        if (query.length === 0) return stacks;
        return stacks.filter(stack => stack.title.toLowerCase().includes(query.toLowerCase()));
    }, [query, stacks]);

    useEffect(() => {
        if (selectedIndex !== -1) {
            const stack = filteredStacks[selectedIndex];
            if (stack) {
                document.getElementById(`stack-${stack.id}`)?.scrollIntoView({ block: "center" });
            }
        }
    }, [selectedIndex, filteredStacks]);

    const handleChangeQuery = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setSelectedIndex(-1);
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            setSelectedIndex(Math.min(selectedIndex + 1, filteredStacks.length - 1));
        } else if (e.key === "ArrowUp") {
            setSelectedIndex(Math.max(selectedIndex - 1, -1));
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0) {
                handleSelectStack(filteredStacks[selectedIndex]);
            }
        }
    }

    const handleSelectStack = useCallback((stack: IStack) => {
        props.openPanel({
            props: {
                projectId: props.projectId,
                stackId: stack.id,
                onSelect: props.onSelect,
                onFilter: props.onFilter
            },
            renderPanel: TasksPanel,
            title: stack.title,
        });
    }, [props.projectId, props.onSelect, props.onFilter]);

    return (
        <Grid gap={10} vertical>
            {stacks.length === 0 ? (
                <Grid vertical>
                    <BlankSlate
                        icon={APPICONS.TASK}
                        title="No tasks"
                        description="The selected project does not contain any stacks."
                    >
                        <Button onClick={props.closePanel}>Go back</Button>
                    </BlankSlate>
                </Grid>
            ) : (
                <>
                    <InputGroup
                        placeholder="Search stack"
                        autoFocus
                        leftIcon={<Icon icon="search" />}
                        round
                        onChange={handleChangeQuery}
                        onKeyDown={handleKeyDown}
                    />
                    {filteredStacks.length ? (
                        <Scroller vertical>
                            <Menu size="large">
                                {filteredStacks.map((stack) => (
                                    <StackItem
                                        key={stack.id}
                                        stackId={stack.id}
                                        selected={selectedIndex === filteredStacks.indexOf(stack)}
                                        onClick={() => handleSelectStack(stack)}
                                        onFilter={props.onFilter}
                                    />
                                ))}
                            </Menu>
                        </Scroller>
                    ) : (
                        <Grid vertical>
                            <BlankSlate icon={APPICONS.SEARCH} title="No stacks found" description="Try entering a different search query." />
                        </Grid>
                    )}
                </>
            )}
        </Grid>
    );
};

interface TasksPanelInfo extends TaskPickerProps {
    stackId: string;
    projectId: string;
}

const TasksPanel: React.FC<PanelProps<TasksPanelInfo>> = props => {
    const tasks = useStackTasks(props.stackId);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const filteredTasks = useMemo(() => {
        if (query.length === 0) return props.onFilter ? props.onFilter(tasks) : tasks;
        const filtered = tasks.filter(task => task.title.toLowerCase().includes(query.toLowerCase()));
        return props.onFilter ? props.onFilter(filtered) : filtered;
    }, [query, tasks, props.onFilter]);

    useEffect(() => {
        if (selectedIndex !== -1) {
            const task = filteredTasks[selectedIndex];
            if (task) {
                document.getElementById(`task-${task.id}`)?.scrollIntoView({ block: "center" });
            }
        }
    }, [selectedIndex, filteredTasks]);

    const handleChangeQuery = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setSelectedIndex(-1);
    }, [setQuery, setSelectedIndex]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            setSelectedIndex(Math.min(selectedIndex + 1, filteredTasks.length - 1));
        } else if (e.key === "ArrowUp") {
            setSelectedIndex(Math.max(selectedIndex - 1, -1));
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0) {
                props.onSelect?.(filteredTasks[selectedIndex].id);
            }
        }
    }, [selectedIndex, filteredTasks, props.onSelect]);

    return (
        <Grid gap={10} vertical>
            {tasks.length === 0 ? (
                <Grid vertical>
                    <BlankSlate
                        icon={APPICONS.TASK}
                        title="No tasks"
                        description="The selected stack does not contain any tasks."
                    >
                        <Button onClick={props.closePanel}>Go back</Button>
                    </BlankSlate>
                </Grid>
            ) : (
                <>
                    <InputGroup
                        placeholder="Search task"
                        autoFocus
                        leftIcon={<Icon icon="search" />}
                        round
                        onChange={handleChangeQuery}
                        onKeyDown={handleKeyDown}
                    />
                    {filteredTasks.length ? (
                        <Scroller vertical>
                            <Menu>
                                {filteredTasks.map((task) => (
                                    <TaskItem
                                        key={task.id}
                                        taskId={task.id}
                                        selected={selectedIndex === filteredTasks.indexOf(task)}
                                        onClick={() => props.onSelect?.(task.id)}
                                    />
                                ))}
                            </Menu>
                        </Scroller>
                    ) : (
                        <Grid vertical>
                            <BlankSlate icon={APPICONS.SEARCH} title="No tasks found" description="Try entering a different search query." />
                        </Grid>
                    )}
                </>
            )}
        </Grid>

    );
};

const useTaskPicker = ({ onSelect, onFilter }: TaskPickerProps) => {
    const onSelectRef = useRef(onSelect);
    const onFilterRef = useRef(onFilter);

    const handleSelect = useCallback((taskId: string) => {
        onSelectRef.current(taskId);
    }, []);

    const handleFilter = useCallback((tasks: ITask[]) => {
        return onFilterRef.current?.(tasks) || tasks;
    }, []);

    const [currentPanelStack, setCurrentPanelStack] = useState<
        Array<Panel<TaskPickerProps | StacksPanelInfo | TasksPanelInfo>>
    >([{
        props: { onSelect: handleSelect, onFilter: handleFilter },
        renderPanel: ProjectsPanel,
        title: "Projects",
    }]);

    const addToPanelStack = useCallback(
        (newPanel: Panel<TaskPickerProps | StacksPanelInfo | TasksPanelInfo>) =>
            setCurrentPanelStack(stack => [...stack, newPanel]),
        [],
    );
    const removeFromPanelStack = useCallback(
        () => setCurrentPanelStack(stack => stack.slice(0, -1)),
        [],
    );

    return { addToPanelStack, removeFromPanelStack, currentPanelStack };
}

type TaskPickerState = ReturnType<typeof useTaskPicker>;

const TaskPicker2Content = ({ addToPanelStack, removeFromPanelStack, currentPanelStack }: TaskPickerState) => {
    return (
        <div className="task-picker-2">
            <PanelStack
                showPanelHeader={false}
                onOpen={addToPanelStack as never}
                onClose={removeFromPanelStack}
                stack={currentPanelStack as never}
            />
        </div>
    );
}

export const TaskPicker2 = (props: TaskPickerProps) => {
    const taskPicker = useTaskPicker(props);
    return <TaskPicker2Content {...taskPicker} />;
}

interface TaskPicker2DialogProps {
    onClose: (taskId?: string) => void;
    onFilter?: (tasks: ITask[]) => ITask[];
}

export const TaskPicker2Dialog = ({ onClose, onFilter }: TaskPicker2DialogProps) => {
    const [open, setOpen] = useState(true);

    const onSelect = (taskId?: string) => {
        setOpen(false);
        onClose(taskId);
    }

    const taskPicker = useTaskPicker({ onSelect, onFilter });
    const { removeFromPanelStack, currentPanelStack } = taskPicker;

    const handleBack = useCallback(() => {
        if (currentPanelStack.length > 1) {
            removeFromPanelStack();
        }
    }, [currentPanelStack, removeFromPanelStack]);

    const title = useMemo(() => {
        const currentTitle = currentPanelStack[currentPanelStack.length - 1].title;

        return (
            <Row justify="left" align="center" gutter={5}>
                {currentPanelStack.length > 1 && (
                    <Button
                        icon="chevron-left"
                        variant="minimal"
                        size="small"
                        onClick={handleBack} />
                )}
                {currentTitle}
            </Row>
        );
    }, [currentPanelStack, handleBack]);

    return (
        <Dialog
            title={title}
            isOpen={open}
            onClose={() => onSelect()}
            onClosed={() => onClose()}
            className="task-picker-dialog"
        >
            <div className={Classes.DIALOG_BODY}>
                <TaskPicker2Content {...taskPicker} />
            </div>
        </Dialog>
    );
}

interface StackItemProps {
    stackId: string;
    selected?: boolean;
    onClick: (stackId: string) => void;
    onFilter?: (tasks: ITask[]) => ITask[];
}
export const StackItem = ({ stackId, selected, onClick, onFilter }: StackItemProps) => {
    const info = useStackInfo(stackId);

    if (!info) {
        return (<MenuItem text="Loading..." className={Classes.SKELETON} />);
    }

    const { tint, tasks, title, } = info;

    return (
        <MenuItem
            id={`stack-${stackId}`}
            text={(
                <Grid gap={0}>
                    <div>{title}</div>
                    <small className={Classes.TEXT_MUTED}>{onFilter ? onFilter(tasks)?.length : tasks?.length} tasks</small>
                </Grid>
            )}
            icon={<Icon icon="stop-filled" color={tint || Colors.GRAY3} />}
            labelElement={<Icon icon="chevron-right" />}
            active={selected}
            onClick={() => onClick(stackId)}
        />
    );
}


interface TaskItemProps {
    taskId: string;
    selected?: boolean;
    onClick: () => void;
}
const TaskItem = ({ taskId, selected, onClick }: TaskItemProps) => {
    const { task, isLoading } = useTask(taskId);
    const stack = useStack(task?.stack);

    if (isLoading) return <MenuItem text="Loading..." className={Classes.SKELETON} />;
    if (!task) return null;

    const { title, assignees, priority, projectInfo } = task;

    return (
        <MenuItem
            id={`task-${taskId}`}
            text={
                <Grid gap={0}>
                    <Row justify="left" gutter={5} align="center">
                        <TaskState taskId={taskId} disabled />
                        {title}
                    </Row>
                    <div className={Classes.TEXT_MUTED} style={{ paddingLeft: 25 }}>{projectInfo?.title ?? "No project"} / {stack?.title ?? "No stack"}</div>
                </Grid>
            }
            multiline
            active={selected}

            labelElement={(
                <Row align="center" gutter={5}>
                    {priority && priority !== PRIORITY.NONE && <PriorityChip priority={priority} />}
                    {assignees.length > 0 && <TaskAssignees assignees={assignees} minimal showEmpty max={1} disabled />}
                </Row>
            )}
            onClick={onClick}
        />
    );
}
