// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, InputGroup, Intent, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarSlotInfo } from "app/utils/calendarSlot";
import { Icon, Scroller } from "app/components/common";
import { useOnClickOutside, useProjectDocuments } from "app/hooks";
import { APPICONS, ITask } from "@stacks/types";
import { CalendarActions } from "app/store/actions";
import { scrollIntoView } from "app/utils/dom";

type CalendarTasksMenuProps = {
    slot: CalendarSlotInfo;
    onCancel: () => void;
};

interface TaskExtended extends ITask {
    projectName?: string;
}

export const CalendarTasksMenu: FunctionComponent<CalendarTasksMenuProps> = ({ slot, onCancel }) => {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<number | undefined>();
    const projects = useProjectDocuments();
    const menuRef = useRef<HTMLDivElement | null>(null);

    useOnClickOutside(menuRef, onCancel);

    const filteredTasks: TaskExtended[] = useMemo(() => {
        return []
    }, [query]);

    useEffect(() => {
        if (selected == null) return;
        const selectedTask = filteredTasks[selected];
        scrollIntoView(document.getElementById(`task-item-${selectedTask.id}`));
    }, [selected, filteredTasks]);

    const handleSetQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.currentTarget.value);

        if (selected != null) {
            setSelected(undefined);
        }
    };

    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            if (selected == null || (selected != null && selected + 1 > filteredTasks.length - 1)) {
                setSelected(0);
            } else {
                setSelected(selected + 1);
            }
        } else if (event.key === "ArrowUp") {
            if (selected == null || (selected != null && selected - 1 < 0)) {
                setSelected(filteredTasks.length - 1);
            } else {
                setSelected(selected - 1);
            }
        } else if (event.key === "Enter") {
            if (selected != null) {
                handleAssignTask(filteredTasks[selected]);
            }
        } else if (event.key === "Escape") {
            if (event.currentTarget.value.trim().length === 0) {
                onCancel();
            } else {
                setQuery("");
                setSelected(undefined);
            }
        }
    };

    return (
        <div style={{ minWidth: 300 }} ref={menuRef}>
            <div style={{ padding: 5, paddingTop: 10 }}>
                <InputGroup
                    round
                    fill
                    autoFocus
                    type="search"
                    placeholder="Search task..."
                    leftIcon={<Icon icon="search" />}
                    defaultValue={query}
                    onChange={handleSetQuery}
                    onKeyDown={handleOnKeyDown}
                />
            </div>
            <Scroller thin vertical maxHeight={300}>
                <Menu style={{ maxWidth: 300 }}>
                    {filteredTasks.map((task, i) => (
                        <MenuItem
                            key={task.id}
                            active={selected === i}
                            id={`task-item-${task.id}`}
                            text={
                                <>
                                    <div className={Classes.TEXT_OVERFLOW_ELLIPSIS}>{task.title}</div>
                                    <small className={Classes.TEXT_MUTED}>in {task.projectName}</small>
                                </>
                            }
                            icon={<Icon icon="check-circle" />}
                            onClick={() => handleAssignTask(task)}
                        />
                    ))}
                </Menu>
            </Scroller>
            <Menu>
                <MenuDivider />
                <MenuItem
                    text={translate("Cancel")}
                    icon={<Icon icon={APPICONS.CLOSE} />}
                    intent={Intent.WARNING}
                    onClick={onCancel}
                />
            </Menu>
        </div>
    );

    function handleAssignTask(task: ITask) {
        const allDay = slot.slots.length === 1;
        const start = slot.slots.at(0);
        const end = slot.slots.at(-1);

        CalendarActions.onTaskDrop(task, start as Date, allDay, end as Date);
        onCancel();
    }
};
