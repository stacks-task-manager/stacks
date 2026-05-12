// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Single-project task list picker (popover menu). For multi-step project → stack → task flows, use `TaskPicker2`. */
import { translate } from "@stacks/translations";
import { Classes, InputGroup, Menu } from "@blueprintjs/core";
import classnames from "classnames";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { BlankSlate, Icon, Scroller } from "app/components/common";
import { ITask } from "@stacks/types";
import { scrollIntoView } from "app/utils/dom";
import { TaskMenuItem } from "app/widgets";
import { useProjectTasks } from "app/hooks";
import { TasksStore } from "app/store/tasks";
import { TasksActions } from "app/store/actions";

interface ITaskPickerProps {
    projectId: string;
    value?: string;
    contained?: boolean;
    shouldDismissPopover?: boolean;
    disabledTasks?: string[];
    onChange: (taskId: string) => void;
    onClose?: () => void;
}
export const TaskPicker: FunctionComponent<ITaskPickerProps> = ({
    projectId,
    value,
    contained,
    shouldDismissPopover,
    disabledTasks,
    onChange,
    onClose,
}) => {
    const [query, setQuery] = useState("");
    const tasks = useProjectTasks(projectId);
    const selectedRef = useRef<number | undefined>(undefined);
    const [selected, setSelected] = useState<number | undefined>();
    const debounce = useRef<NodeJS.Timeout | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const dismissRef = useRef<HTMLButtonElement>(null);

    const filteredTasks = useMemo(() => {
        if (query.length > 0) {
            return tasks.filter(
                task =>
                    !(disabledTasks || []).includes(task.id) &&
                    task.title.toLowerCase().includes(query.toLowerCase())
            );
        }

        return tasks;
    }, [query, tasks, disabledTasks]);

    const loadTasks = async () => {
        if (TasksStore.get().loadedProjects.includes(projectId)) return;
        setSelected(undefined);
        await TasksActions.loadByProject(projectId);
    };

    useEffect(() => {
        if (selected == null) return;
        const taskEl = document.getElementById(`task-menu-item-${tasks[selected].id}`);
        scrollIntoView(taskEl);
    }, [selected]);

    useEffect(() => {
        loadTasks();
    }, [projectId]);

    const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }
        const query = event.target.value;
        debounce.current = setTimeout(() => {
            setQuery(query);
        }, 300);
    };

    const handleSelectTask = (task: ITask) => {
        onChange(task.id);
    };

    const selectActive = () => {
        if (selected != null) {
            handleSelectTask(filteredTasks[selected]);
        }
    };

    const gotoNextItem = () => {
        if (selectedRef.current == null) {
            selectedRef.current = 0;
        } else {
            selectedRef.current =
                selectedRef.current + 1 < filteredTasks.length ? selectedRef.current + 1 : 0;
        }

        setSelected(selectedRef.current);
    };

    const gotoPrevItem = () => {
        if (selectedRef.current == null) {
            selectedRef.current = 0;
        } else {
            selectedRef.current =
                selectedRef.current - 1 < 0 ? filteredTasks.length - 1 : selectedRef.current - 1;
        }

        setSelected(selectedRef.current);
    };

    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            gotoNextItem();
        } else if (event.key === "ArrowUp") {
            gotoPrevItem();
        } else if (event.key === "Enter") {
            selectActive();
            if (dismissRef.current) {
                dismissRef.current.click();
            }
        } else if (event.key === "Escape") {
            if (event.currentTarget.value.trim().length === 0) {
                if (dismissRef.current) {
                    dismissRef.current.click();
                }
                if (onClose) onClose();
            } else {
                setQuery("");
                selectedRef.current = undefined;
                setSelected(undefined);
                if (searchRef.current) {
                    searchRef.current.value = "";
                }
            }
        }
    };

    return (
        <div className={classnames("tasks-picker", { contained })}>
            <div style={{ padding: 5 }}>
                <button ref={dismissRef} className={Classes.POPOVER_DISMISS} style={{ display: "none" }} />
                <InputGroup
                    leftIcon={<Icon icon="search" />}
                    placeholder={`${translate("Search")}...`}
                    autoFocus
                    type="search"
                    inputRef={searchRef}
                    onKeyDown={handleOnKeyDown}
                    onChange={handleQueryChange}
                />
            </div>

            {filteredTasks.length === 0 ? (
                <BlankSlate
                    small
                    title={query.length && !tasks.length ? "Task not found" : "Search a task"}
                    icon="search"
                />
            ) : (
                <Scroller maxHeight={300} vertical thin>
                    <Menu>
                        {filteredTasks.map((task: ITask, index: number) => {
                            const isActive = value === task.id;
                            return (
                                <TaskMenuItem
                                    key={task.id}
                                    task={task}
                                    shouldDismissPopover={shouldDismissPopover || false}
                                    active={isActive}
                                    selected={selected === index}
                                    isLazyLoaded={index > 10}
                                    onClick={() => handleSelectTask(task)}
                                />
                            );
                        })}
                    </Menu>
                </Scroller>
            )}
        </div>
    );
};
