// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, TextArea } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { Icon } from "app/components/common";
import { useAutocomplete } from "app/hooks/autocomplete";

interface INewTaskProps {
    stackId: string;
    isEditing?: boolean;
    minimal?: boolean;
    onEdit?: (added: boolean) => void;
}
export const NewTask: FunctionComponent<INewTaskProps> = ({ stackId, isEditing, minimal, onEdit }) => {
    const [editing, setEditing] = useState(isEditing || false);
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const { show, hide, onSelect } = useAutocomplete({
        tags: true,
        statuses: true,
        emojis: true,
        priority: true,
    });

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            show(inputRef.current);
        }
    }, [editing]);

    useEffect(() => {
        setEditing(Boolean(isEditing));
    }, [isEditing]);

    onSelect(() => {
        if (inputRef.current) {
            setValue(inputRef.current.value);
        }
    });

    const handleEndEditing = () => {
        hide(inputRef.current);
        setEditing(false);
    };

    const handleAddTask = async () => {
        const tasksLines = value.split(/\r?\n/).filter((task: string) => task.length > 0);
        if (!tasksLines.length) {
            setValue("");
            handleEndEditing();
            return;
        }

        // const projectId = getCurrentProjectId();

        // const newTasks = tasksLines.map(task => ({
        //     ...TaskTemplate,
        //     title: task,
        //     project: projectId,
        // }));

        // const tasks: ITask[] = await TasksActions.addMultiple(newTasks);

        // StacksActions.addTasks(
        //     stackId,
        //     tasks.map(task => task.id),
        //     top
        // );

        setValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAddTask();
            onEdit && onEdit(true);
        } else if (e.key === "Escape") {
            e.stopPropagation();
            handleEndEditing();
            setValue("");
            onEdit && onEdit(false);
        }
    };

    const handleBlur = () => {
        handleAddTask();
        handleEndEditing();
    };

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(event.currentTarget.value);
    };

    return (
        <div className={classNames("new-task", { editing, minimal })}>
            {editing && (
                <TextArea
                    value={value}
                    autoResize
                    small
                    fill
                    placeholder={translate("Add task")}
                    inputRef={inputRef}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onChange={handleChange}
                />
            )}

            {!editing && !minimal && (
                <Button
                    icon={<Icon icon="plus" />}
                    minimal
                    small
                    onClick={() => setEditing(true)}
                    id={stackId}
                >
                    {translate("Add task")}
                </Button>
            )}
        </div>
    );
};
