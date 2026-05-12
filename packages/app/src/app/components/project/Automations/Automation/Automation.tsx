// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
    AnchorButton,
    Button,
    Classes,
    InputGroup,
    Intent,
    Menu,
    MenuItem,
    Colors,
    Tooltip,
    Popover,
} from "@blueprintjs/core";
import { SymbolSquare } from "@blueprintjs/icons";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { produce } from "immer";
import { AUTOMATION_EVENT_LABELS } from "app/locale/dynamic-messages";

import { Col, Grid, Icon, Row } from "app/components/common";
import { StacksPicker, TaskDetailsSection } from "app/components/project";
import {
    AUTOMATIOD_DO,
    AUTOMATION_EVENT,
    AUTOMATION_EVENT_ICON,
    IAutomation,
    IAutomationAction,
    IStack,
} from "@stacks/types";
import { ProjectsActions } from "app/store/actions";
import { AutomationAction } from "../AutomationAction/AutomationAction";
import { AutomationNewAction } from "../AutomationNewAction/AutomationNewAction";
import { uuidv4 } from "app/utils/uuid";
import { getStacks } from "app/hooks";

interface IAutomationsProps {
    automation?: Partial<IAutomation>;
    onCancel: () => void;
}
export const Automation: FunctionComponent<IAutomationsProps> = ({ automation, onCancel }) => {
    const [id, setId] = useState<string | undefined>(undefined);
    const [title, setTitle] = useState<string | undefined>(undefined);
    const [event, setEvent] = useState<AUTOMATION_EVENT | undefined>(undefined);
    const [value, setValue] = useState<string | undefined>(undefined);
    const [actions, setActions] = useState<IAutomationAction[]>([]);
    const [showNewAction, setShowNewAction] = useState(false);

    useEffect(() => {
        if (automation != null) {
            setId(automation.id);
            setTitle(automation.title);
            setEvent(automation.event);
            setValue(automation.value);
            if (automation.actions) {
                setActions(automation.actions);
            }
            if (automation.actions && automation.actions.length && automation.actions[0].editing) {
                setShowNewAction(true);
            }
        }
    }, [automation]);

    useEffect(() => {
        if (event === AUTOMATION_EVENT.MOVED) {
            if (actions.some((a: IAutomationAction) => a.do === AUTOMATIOD_DO.MOVE)) {
                window.toaster.show({
                    message: "Move action was remove because the event is triggered when moved",
                    icon: <Icon icon="trash" />,
                });
            }
            setActions(actions.filter((a: IAutomationAction) => a.do !== AUTOMATIOD_DO.MOVE));
        }
    }, [event]);

    const stacksButton = useMemo(() => {
        if (event !== AUTOMATION_EVENT.MOVED && event !== AUTOMATION_EVENT.CREATED) return null;

        const stacks = getStacks();
        const stack = stacks.find((s: IStack) => s.id === value);

        return (
            <>
                <span className={Classes.TEXT_DISABLED}>
                    {event === AUTOMATION_EVENT.MOVED ? "to" : "in"}
                </span>
                <StacksPicker
                    value={value ? [value] : []}
                    onChange={(stacksIds: string[]) => setValue(stacksIds.at(-1))}
                >
                    <Button
                        minimal
                        small
                        icon={stack && <SymbolSquare color={stack ? stack.tint : Colors.GRAY3} />}
                    >
                        {value ? stack?.title : "select stack"}
                    </Button>
                </StacksPicker>
            </>
        );
    }, [event, value]);

    const eventLabel = useMemo(() => {
        if (event == null) return translate("select event");
        return AUTOMATION_EVENT_LABELS[event];
    }, [event]);

    const editingActions = useMemo(() => {
        return actions.filter(action => action.editing);
    }, [actions]);

    const canAddAction = useMemo(() => {
        if (!event) return false;
        if ((event === AUTOMATION_EVENT.CREATED || event === AUTOMATION_EVENT.MOVED) && !value) return false;
        if (editingActions.length > 0) return false;
        return true;
    }, [event, value, editingActions]);

    const canSave = useMemo(() => {
        return (
            actions.length &&
            title != null &&
            title.trim().length &&
            event != null &&
            editingActions.length === 0
        );
    }, [actions, title]);

    const handleChangeTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(event.target.value);
    };

    const handleAddNewAction = () => {
        setActions([
            ...actions,
            {
                id: uuidv4(),
                do: undefined as unknown as AUTOMATIOD_DO,
                value: "",
                editing: true,
            },
        ]);
    };

    const handleAddAction = (action: IAutomationAction) => {
        // it's an update
        // could be that this action came from the wizard
        if (actions.some(a => a.id === action.id)) {
            setActions(
                actions.map(a => {
                    if (a.id === action.id) return action;
                    return a;
                })
            );
        }
        // just add the new action
        else {
            setActions([...actions, action]);
        }

        setShowNewAction(false);
    };

    const handleSaveAutomation = () => {
        if (title == null || event == null || actions.length === 0) return;

        const newAutomation: IAutomation = {
            id: id || uuidv4(),
            title,
            enabled: true,
            event,
            value,
            actions,
        };

        ProjectsActions.upsertAutomation(newAutomation);
        onCancel();
    };

    const handleRemoveAction = (actionId: string) => {
        setActions(actions.filter(a => a.id !== actionId));
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        setActions(
            produce(actions, draftActions => {
                const movedAction = { ...draftActions[result.source.index] };
                draftActions.splice(result.source.index, 1);
                draftActions.splice(result.destination!.index, 0, movedAction);
            })
        );
    };

    const handleCancelActionEdit = (actionId?: string) => {
        if (actionId) {
            // if there's an action there with this specific id
            // we remove it
            if (actions.some(action => action.id === actionId)) {
                setActions(actions.filter(action => action.id !== actionId));
            }
        }
        setShowNewAction(false);
    };

    return (
        <>
            <div className={Classes.DIALOG_BODY}>
                <Grid padding={[10, 10]} gap={20}>
                    <TaskDetailsSection title={translate("Title")} vertical>
                        <InputGroup
                            placeholder={translate("Automation name")}
                            fill
                            large
                            defaultValue={title}
                            onChange={handleChangeTitle}
                        />
                    </TaskDetailsSection>
                    <Row>
                        <Col>
                            <TaskDetailsSection title="Event" vertical>
                                <div className="automation-box-row automation-event">
                                    <span className={Classes.TEXT_DISABLED}>
                                        {translate("When a task is")}
                                    </span>
                                    <Popover
                                        disabled={showNewAction}
                                        content={<EventPickerMenu onSelect={setEvent} />}
                                    >
                                        <Button variant="minimal" size="small" disabled={showNewAction}>
                                            {eventLabel}
                                        </Button>
                                    </Popover>

                                    {stacksButton}
                                </div>
                            </TaskDetailsSection>
                        </Col>
                    </Row>
                </Grid>
                <Grid gap={0} padding={[10, 10]}>
                    <Row>
                        <Col>
                            <TaskDetailsSection title="Actions" vertical>
                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <Droppable droppableId="droppable">
                                        {provided => (
                                            <div
                                                className="automation-actions"
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                            >
                                                {actions
                                                    // .filter(action => !action.editing)
                                                    .map((action, index) => {
                                                        if (action.editing && event) {
                                                            return (
                                                                <AutomationNewAction
                                                                    key={action.id}
                                                                    event={event}
                                                                    action={action}
                                                                    onSave={handleAddAction}
                                                                    onCancel={handleCancelActionEdit}
                                                                />
                                                            );
                                                        }

                                                        return (
                                                            <AutomationAction
                                                                action={action}
                                                                key={action.id}
                                                                index={index}
                                                                onRemove={handleRemoveAction}
                                                            />
                                                        );
                                                    })}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            </TaskDetailsSection>
                        </Col>
                    </Row>

                    <Row>
                        <Col justify="center">
                            <Tooltip
                                content={translate("Add action")}
                                placement="top"
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                renderTarget={({ isOpen, ref, ...props }) => (
                                    <AnchorButton
                                        {...props}
                                        className="automation-new-action-button"
                                        disabled={!canAddAction}
                                        ref={ref}
                                        onClick={handleAddNewAction}
                                    >
                                        <Icon icon="plus" />
                                    </AnchorButton>
                                )}
                            />
                        </Col>
                    </Row>
                </Grid>
            </div>

            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button variant="minimal" onClick={onCancel}>
                        {translate("Cancel")}
                    </Button>
                    <Button intent={Intent.SUCCESS} disabled={!canSave} onClick={handleSaveAutomation}>
                        {id ? translate("Update") : translate("Save")}
                    </Button>
                </div>
            </div>
        </>
    );
};

interface EventPickerMenuProps {
    onSelect: (event: AUTOMATION_EVENT) => void;
}
const EventPickerMenu: FunctionComponent<EventPickerMenuProps> = ({ onSelect }) => {
    return (
        <Menu>
            {(Object.keys(AUTOMATION_EVENT) as Array<keyof typeof AUTOMATION_EVENT>).map(key => (
                <MenuItem
                    key={key}
                    text={AUTOMATION_EVENT_LABELS[AUTOMATION_EVENT[key]]}
                    icon={<Icon icon={AUTOMATION_EVENT_ICON[key]} />}
                    onClick={() => onSelect(AUTOMATION_EVENT[key])}
                />
            ))}
        </Menu>
    );
};
