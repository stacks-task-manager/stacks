// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Intent, ProgressBar, Tag, TextArea, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback, useMemo, useRef, useState } from "react";
import { APPICONS, ITask, TaskTemplate } from "@stacks/types";
import { BlankSlate, Col, Grid, HotkeyChip, Icon, RoundButton, Row } from "app/components/common";
import { Container } from "app/components/draggable";
import { useSubtasks } from "app/hooks";
import { TasksActions } from "app/store/actions";
import { PreferencesStore } from "app/store/preferences";
import { TaskDetailsSection } from "../Task";
import { Subtask } from "./Subtask";

interface ISubtasksProps {
    parent: ITask;
    disabled?: boolean;
}
export const Subtasks: FunctionComponent<ISubtasksProps> = ({ parent, disabled }) => {
    const [showInput, setShowInput] = useState(false);
    const [showComplete, setShowComplete] = useState(PreferencesStore.get().taskDetailsShowCompletedSubtasks);

    const toggleShowCompleted = () => {
        setShowComplete(!showComplete);
    };

    const handleShowInput = () => {
        setShowInput(true);
    };

    const handleAddSubtask = (title: string) => {
        if (title.length === 0) return;

        TasksActions.add({
            ...TaskTemplate,
            title,
            created: new Date(),
            parent: parent.id,
            project: parent.project,
            stack: parent.stack,
        });
    };

    return (
        <Grid gap={0} padding={30} id="subtasks" data-testid="subtasks-wrapper">
            <Row padding={30}>
                <Col>
                    <TaskDetailsSection
                        title={<SubtasksCounter parentId={parent.id} />}
                        vertical
                        accessory={
                            <SubtasksAccessory
                                parentId={parent.id}
                                showComplete={showComplete}
                                onToggle={toggleShowCompleted}
                            />
                        }
                    >
                        <SubtasksItems parent={parent} disabled={disabled} showComplete={showComplete} />
                        {showInput && (
                            <NewSubtaskInput
                                onAddTask={handleAddSubtask}
                                onEditEnd={() => setShowInput(false)}
                            />
                        )}

                        {!showInput && !disabled ? (
                            <Row>
                                <Col>
                                    <RoundButton
                                        dashed
                                        title={translate("Add subtask")}
                                        id="new-subtask-button"
                                        onClick={handleShowInput}
                                        data-testid="new-subtask-button"
                                    />
                                </Col>
                                <Col justify="right" align="center">
                                    <Tooltip
                                        content="When you click on a subtask, hold down the cmd/ctrl key to edit it inline."
                                        placement="top-end"
                                    >
                                        <Icon
                                            icon="info-circle"
                                            cursor="help"
                                            className={Classes.TEXT_DISABLED}
                                        />
                                    </Tooltip>
                                </Col>
                            </Row>
                        ) : null}
                    </TaskDetailsSection>
                </Col>
            </Row>
        </Grid>
    );
};

const SubtasksCounter = ({ parentId }: { parentId: string }) => {
    const { subtasks } = useSubtasks(parentId);

    const completedCount = useMemo(() => {
        return subtasks.filter(subtask => subtask.done).length;
    }, [subtasks]);

    const completedPercentage = useMemo(() => {
        return (completedCount * 100) / subtasks.length / 100;
    }, [completedCount]);

    return (
        <>
            {translate("Subtasks")}
            {subtasks.length > 0 ? <SubtasksProgress percent={completedPercentage} /> : null}
        </>
    );
};

interface SubtasksAccessoryProps {
    parentId: string;
    showComplete: boolean;
    onToggle: () => void;
}
const SubtasksAccessory: FunctionComponent<SubtasksAccessoryProps> = ({
    parentId,
    showComplete,
    onToggle,
}) => {
    const { subtasks } = useSubtasks(parentId);

    return useMemo(() => {
        if (subtasks.every(subtask => !subtask.done)) return null;
        return (
            <Tag interactive minimal intent={showComplete ? Intent.NONE : Intent.SUCCESS} onClick={onToggle}>
                {showComplete ? "Hide completed" : "Show completed"}
            </Tag>
        );
    }, [showComplete, subtasks]);
};

interface SubtasksItemsProps {
    parent: ITask;
    disabled?: boolean;
    showComplete: boolean;
}
const SubtasksItems: FunctionComponent<SubtasksItemsProps> = ({ parent, disabled, showComplete }) => {
    const { subtasks } = useSubtasks(parent.id);

    const filteredSubtasks = useMemo(() => {
        return showComplete ? subtasks : subtasks.filter(subtask => !Boolean(subtask.done));
    }, [subtasks, showComplete]);

    /** Match board-task DnD: DOM order must follow parent.subtasksOrder or indices splice the wrong ids. */
    const orderedSubtasks = useMemo(() => {
        const baseOrder = parent.subtasksOrder?.length ? parent.subtasksOrder : filteredSubtasks.map(t => t.id);
        const rank = (id: string) => {
            const i = baseOrder.indexOf(id);
            return i === -1 ? Number.MAX_SAFE_INTEGER : i;
        };
        return [...filteredSubtasks].sort(
            (a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id)
        );
    }, [filteredSubtasks, parent.subtasksOrder]);

    const subtasksContainerId = `subtasks-${parent.id}`;

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
        TasksActions.setSubtaskPosition(
            parent.id,
            itemId,
            toIndex,
            fromIndex,
            orderedSubtasks.map(t => t.id)
        );
    };

    return (
        <div className="subtasks">
            {disabled && orderedSubtasks.length === 0 && (
                <BlankSlate
                    title="No subtasks"
                    description="This task has no subtasks"
                    icon={APPICONS.TASK}
                    small
                />
            )}

            <Container id={subtasksContainerId} type="subtask" direction="vertical" onReorder={handleReorder}>
                {orderedSubtasks.map((subtask: ITask) => {
                    return (
                        <Subtask
                            subtask={subtask}
                            key={subtask.id}
                            disabled={disabled}
                            subtasksContainerId={subtasksContainerId}
                        />
                    );
                })}
            </Container>
        </div>
    );
};

interface NewSubtaskInputProps {
    small?: boolean;
    onAddTask: (title: string) => void;
    onEditEnd: () => void;
}

export const NewSubtaskInput: FunctionComponent<NewSubtaskInputProps> = ({ small, onAddTask, onEditEnd }) => {
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    const handleFocus = useCallback((refRef: HTMLTextAreaElement | null) => {
        if (refRef) {
            refRef.focus();
        }

        inputRef.current = refRef;
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();

            if (inputRef.current) {
                onAddTask(inputRef.current.value.trim());
                inputRef.current.value = "";
            }
        } else if (e.key === "Escape") {
            e.stopPropagation();
            onEditEnd();
        }
    };

    const handleBlur = () => {
        if (inputRef.current) {
            onAddTask(inputRef.current.value.trim());
        }
        onEditEnd();
    };

    return (
        <TextArea
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            inputRef={handleFocus}
            rows={1}
            fill
            size={small ? "small" : undefined}
            autoResize
            placeholder="What needs to be done?"
            className="subtasks-new-input"
            data-testid="subtasks-input"
        />
    );
};

const SubtasksProgress = ({ percent }: { percent: number }) => {
    return (
        <span className="subtasks-progress">
            <HotkeyChip keys={[`${Math.round((percent || 0) * 100)}%`]} light />

            <Tooltip content="The progress is based on the immediate children subtasks" placement="top">
                <ProgressBar
                    value={percent}
                    stripes={false}
                    intent={percent >= 1 ? Intent.SUCCESS : Intent.PRIMARY}
                />
            </Tooltip>
        </span>
    );
};
