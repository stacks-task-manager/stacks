// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Checkbox, Classes, Colors, Dialog, InputGroup, Menu, MenuItem, Tag } from "@blueprintjs/core";
import { ItemPredicate, ItemRenderer, Select } from "@blueprintjs/select";
import { APPICONS, PRIORITY, TreeNode } from "@stacks/types";
import React, { useEffect, useState } from "react";
import { xor } from "lodash";

import { BlankSlate, Grid, Icon, Row, Scroller } from "app/components/common";
import { useDocument, useProjectDocuments, useProjectStacks, useStack, useStackInfo, useStackTasks, useStorage, useTask } from "app/hooks";
import { ProjectsActions, TasksActions } from "app/store/actions";
import { PriorityChip } from "app/components/project";
import { TaskAssignees } from "../TaskAssignees/TaskAssignees";

const filterProject: ItemPredicate<TreeNode> = (query, project, _index, exactMatch) => {
    const normalizedTitle = project.title.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    if (exactMatch) {
        return normalizedTitle === normalizedQuery;
    } else {
        return normalizedTitle.indexOf(normalizedQuery) >= 0;
    }
};

const renderProject: ItemRenderer<TreeNode> = (project, { handleClick, handleFocus, modifiers }) => {
    if (!modifiers.matchesPredicate) {
        return null;
    }
    return (
        <MenuItem
            active={modifiers.active}
            disabled={modifiers.disabled}
            key={project.id}
            onClick={handleClick}
            onFocus={handleFocus}
            roleStructure="listoption"
            text={project.title}
        />
    );
};

interface TaskDependenciesDialogProps {
    parentId: string;
    values?: string[];
    onSelect?: (values: string[]) => void;
    onClose?: () => void;
}

export const TaskDependenciesDialog = ({ parentId, values, onSelect, onClose }: TaskDependenciesDialogProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const [query, setQuery] = useState("");
    const [selectedProject, setSelectedProject] = useStorage<string | undefined>("task-dependencies-project", false, undefined, parentId);
    const [selectedStack, setSelectedStack] = useStorage<string | undefined>("task-dependencies-stack", false, undefined, parentId);
    const [selectedTasks, setSelectedTasks] = useState<string[]>(values ?? []);
    const projects = useProjectDocuments();
    const stacks = useProjectStacks(selectedProject);

    useEffect(() => {
        (async () => {
            if (selectedProject) {
                try {
                    const project = await ProjectsActions.load([selectedProject], { silent: true });
                    if (!project) {
                        setSelectedProject(undefined);
                    }
                    await TasksActions.loadByProject(selectedProject);
                } catch (error) {
                    setSelectedProject(undefined);
                }
            }
        })();
    }, [selectedProject]);

    const handleSelectProject = (project: TreeNode) => {
        setSelectedProject(project.id);
        setSelectedStack(undefined);
    };

    const handleSelectStack = (stackId: string) => {
        setSelectedStack(stackId);
    };

    const handleToggleTask = (taskId: string) => {
        setSelectedTasks(xor(selectedTasks, [taskId]));
    };

    const handleOnSelect = () => {
        onSelect?.(selectedTasks);
        setIsOpen(false);
    };

    return (
        <Dialog
            title="Add dependencies"
            isOpen={isOpen}
            className="task-dependencies-dialog"
            onClose={() => setIsOpen(false)}
            onClosed={onClose}
        >
            <div className={Classes.DIALOG_BODY}>
                <div>
                    <Select<TreeNode>
                        items={projects}
                        itemPredicate={filterProject}
                        itemRenderer={renderProject}
                        noResults={<MenuItem disabled={true} text="No results." />}
                        onItemSelect={handleSelectProject}
                        fill
                    >
                        <ProjectButton projectId={selectedProject} />
                    </Select>

                    {selectedProject ? (
                        <Scroller vertical maxHeight={550}>
                            {stacks && (
                                <Menu>
                                    {stacks.map((stack) => (
                                        <StackItem
                                            key={stack.id}
                                            stackId={stack.id}
                                            selected={stack.id === selectedStack}
                                            onClick={handleSelectStack}
                                        />
                                    ))}
                                </Menu>
                            )}
                        </Scroller>
                    ) : (
                        <Grid vertical>
                            <BlankSlate
                                title="Select project"
                                description="Select a project to add dependencies."
                                icon={APPICONS.PROJECT}
                                small />
                        </Grid>
                    )}
                </div>
                <div>
                    <InputGroup
                        fill
                        placeholder="Search tasks"
                        disabled={!selectedProject || !selectedStack}
                        leftIcon="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />

                    <TasksPanel
                        selected={selectedTasks}
                        stackId={selectedStack}
                        parentId={parentId}
                        onSelect={handleToggleTask}
                    />
                </div>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button
                        variant="minimal"
                        onClick={() => setIsOpen(false)}
                    >
                        {translate("Cancel")}
                    </Button>
                    <Button
                        text={`Select tasks ${selectedTasks.length > 0 ? `(${selectedTasks.length})` : ""}`}
                        intent="primary"
                        disabled={selectedTasks.length === 0 && onSelect != null}
                        onClick={handleOnSelect} />
                </div>
            </div>
        </Dialog>
    );
}

const ProjectButton = ({ projectId }: { projectId?: string }) => {
    const project = useDocument(projectId)
    return (
        <Button text={project?.title ?? "Select a project"} fill endIcon="double-caret-vertical" alignText="left" />
    );
}

interface StackItemProps {
    stackId: string;
    selected: boolean;
    onClick: (stackId: string) => void;
}
const StackItem = ({ stackId, selected, onClick }: StackItemProps) => {
    const info = useStackInfo(stackId);

    if (!info) {
        return (<MenuItem text="Loading..." className={Classes.SKELETON} />);
    }

    const { tint, tasks, title, } = info;

    return (
        <MenuItem
            text={title}
            icon={<Icon icon="stop-filled" color={tint || Colors.GRAY3} />}
            labelElement={<Tag round minimal>{tasks?.length}</Tag>}
            active={selected}
            onClick={() => onClick(stackId)}
        />
    );
}

interface TasksPanelProps {
    parentId?: string;
    stackId?: string;
    selected: string[];
    onSelect: (taskId: string) => void;
}
const TasksPanel = ({ parentId, stackId, selected, onSelect }: TasksPanelProps) => {
    const tasks = useStackTasks(stackId);

    if (!stackId) {
        return (
            <Grid vertical>
                <BlankSlate
                    title="Select a column"
                    description="Select a column to view the tasks."
                    icon={APPICONS.TASK}
                    small />
            </Grid>
        );
    }

    return (
        <Scroller vertical maxHeight={550}>
            <Menu>
                {tasks.map((task) => (
                    <TaskItem key={task.id}
                        taskId={task.id}
                        disabled={task.id === parentId}
                        selected={selected.includes(task.id)}
                        onClick={onSelect}
                    />
                ))}
            </Menu>
        </Scroller>
    );
}

interface TaskItemProps {
    taskId: string;
    selected: boolean;
    disabled?: boolean;
    onClick: (taskId: string) => void;
}
const TaskItem = ({ taskId, selected, disabled, onClick }: TaskItemProps) => {
    const { task, isLoading } = useTask(taskId);
    const stack = useStack(task?.stack);

    if (isLoading) return <MenuItem text="Loading..." className={Classes.SKELETON} />;
    if (!task) return null;

    const { title, assignees, priority, projectInfo } = task;

    return (
        <MenuItem
            text={
                <Grid gap={0}>
                    <Checkbox label={title} inline checked={selected} />
                    <div className={Classes.TEXT_MUTED} style={{ paddingLeft: 25 }}>{projectInfo?.title ?? "No project"} / {stack?.title ?? "No stack"}</div>
                </Grid>
            }
            disabled={disabled}
            multiline
            onClick={() => onClick(taskId)}
            labelElement={(
                <Row align="center" gutter={5}>
                    {priority && priority !== PRIORITY.NONE && <PriorityChip priority={priority} />}
                    {assignees.length > 0 && <TaskAssignees assignees={assignees} minimal showEmpty max={1} disabled />}
                </Row>
            )}
        />
    );
}