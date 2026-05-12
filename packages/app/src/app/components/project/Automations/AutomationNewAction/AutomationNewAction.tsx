// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Classes,
    Colors,
    Intent,
    Menu,
    MenuItem,
    NumericInput,
    Popover,
    Tooltip,
} from "@blueprintjs/core";
import { SymbolSquare } from "@blueprintjs/icons";
import { translate } from "@stacks/translations";
import {
    AUTOMATIOD_DO,
    AUTOMATION_ACTION_ICON,
    AUTOMATION_EVENT,
    IAutomationAction,
    ITag,
} from "@stacks/types";
import { Icon, Scroller } from "app/components/common";
import { ProgressPicker, StacksPicker, TaskTags } from "app/components/project";
import { getTag, useStack } from "app/hooks";
import { AUTOMATIONS_DO_LABELS } from "app/locale/dynamic-messages";
import { PeopleStore } from "app/store/people";
import { uuidv4 } from "app/utils/uuid";
import { AssigneesPicker, StatusPicker } from "app/widgets";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";

interface IAutomationNewActionProps {
    event: AUTOMATION_EVENT;
    action?: Partial<IAutomationAction>;
    value?: string | number | string[];
    onSave: (action: IAutomationAction) => void;
    onCancel: (actionId?: string) => void;
}
export const AutomationNewAction: FunctionComponent<IAutomationNewActionProps> = ({
    event,
    action,
    onSave,
    onCancel,
}) => {
    const [theAction, setTheAction] = useState<AUTOMATIOD_DO | undefined>(action ? action.do : undefined);
    const [personId, setPersonId] = useState<string | undefined>(undefined);
    const [days, setDays] = useState<number | undefined>(undefined);
    const [status, setStatus] = useState<ITag | undefined>(undefined);
    const [tags, setTags] = useState<string[]>([]);
    const [stack, setStack] = useState<string>();
    const [progress, setProgress] = useState<number>(0);

    useEffect(() => {
        if (!action) return;

        if (action.do && [AUTOMATIOD_DO.ASSIGN, AUTOMATIOD_DO.UNASSIGN].includes(action.do) && action.value) {
            setPersonId(action.value as string);
        } else if (
            action.do &&
            [AUTOMATIOD_DO.STARTDATE, AUTOMATIOD_DO.DUEDATE, AUTOMATIOD_DO.DODATE].includes(action.do) &&
            action.value
        ) {
            setDays(action.value as number);
        } else if (action.do && AUTOMATIOD_DO.ADDSTATUS === action.do && action.value) {
            const status = getTag(action.value as string);
            setStatus(status);
        } else if (action.do && AUTOMATIOD_DO.ADDTAG === action.do && action.value) {
            setTags(action.value as string[]);
        }
    }, []);

    const person = useMemo(() => {
        if (!personId) return "select person";
        const { people } = PeopleStore.get();

        const person = people.find(p => p.id === personId);
        if (!person) return "select person";
        return person.firstName + " " + person.lastName;
    }, [personId]);

    const canSave = useMemo(() => {
        if (!theAction) return false;
        if ((theAction === AUTOMATIOD_DO.ASSIGN || theAction === AUTOMATIOD_DO.UNASSIGN) && personId == null)
            return false;
        if (
            theAction === AUTOMATIOD_DO.STARTDATE ||
            theAction === AUTOMATIOD_DO.DUEDATE ||
            theAction === AUTOMATIOD_DO.DODATE
        ) {
            if (days == null) return false;
        }
        if (theAction === AUTOMATIOD_DO.ADDSTATUS && !status) return false;
        if (
            (theAction === AUTOMATIOD_DO.ADDTAG || theAction === AUTOMATIOD_DO.REMOVETAG) &&
            tags.length === 0
        )
            return false;
        if (theAction === AUTOMATIOD_DO.MOVE && stack == null) return false;
        if (theAction === AUTOMATIOD_DO.PROGRESS && progress == null) return false;
        return true;
    }, [theAction, personId, days, status, tags, stack, progress]);

    const handleActionChange = (action?: AUTOMATIOD_DO) => {
        setTheAction(action);
    };

    const handleSaveAction = () => {
        if (theAction == null) return;
        let value: string | number | string[] = "";

        // ASSIGN or UNASSIGN
        if (theAction === AUTOMATIOD_DO.ASSIGN || theAction === AUTOMATIOD_DO.UNASSIGN) {
            if (personId == null) return;
            value = personId;
        }

        // STAR or DUE DATE
        if (
            theAction === AUTOMATIOD_DO.STARTDATE ||
            theAction === AUTOMATIOD_DO.DUEDATE ||
            theAction === AUTOMATIOD_DO.DODATE
        ) {
            if (days == null) return;
            value = days;
        }

        // ADD TAG
        if (theAction === AUTOMATIOD_DO.ADDTAG || theAction === AUTOMATIOD_DO.REMOVETAG) {
            value = tags;
        }

        // MOVE
        if (theAction === AUTOMATIOD_DO.MOVE) {
            value = stack || "";
        }

        // ADD STATUS
        if (theAction === AUTOMATIOD_DO.ADDSTATUS) {
            if (status == null) return;
            value = status.id;
        }

        // SET PROGRESS
        if (theAction === AUTOMATIOD_DO.PROGRESS) {
            if (progress == null) return;
            value = progress;
        }

        onSave({
            id: action?.id ?? uuidv4(),
            do: theAction,
            value,
        });
    };

    return (
        <div className="automation-box-row automation-new-action">
            <div className="automation-new-action__content">
                <Popover
                    content={
                        <Scroller thin vertical maxHeight={320}>
                            <Menu>
                                {(Object.keys(AUTOMATIOD_DO) as Array<keyof typeof AUTOMATIOD_DO>).map(
                                    key => {
                                        let disabled = false;

                                        if (
                                            // if the event is moved and the action is move
                                            (event === AUTOMATION_EVENT.MOVED &&
                                                AUTOMATIOD_DO[key] === AUTOMATIOD_DO.MOVE) ||
                                            // if the event is archive and action is either move or archive
                                            // if we archive a task there's no reason to do these actions
                                            (event === AUTOMATION_EVENT.ARCHIVED &&
                                                (AUTOMATIOD_DO[key] === AUTOMATIOD_DO.ARCHIVE ||
                                                    AUTOMATIOD_DO[key] === AUTOMATIOD_DO.MOVE)) ||
                                            // if the event is created and the action is: archive, move, done, todo
                                            // if you create a task you cannot immediatelly do these actions
                                            (event === AUTOMATION_EVENT.CREATED &&
                                                (AUTOMATIOD_DO[key] === AUTOMATIOD_DO.ARCHIVE ||
                                                    AUTOMATIOD_DO[key] === AUTOMATIOD_DO.MOVE ||
                                                    AUTOMATIOD_DO[key] === AUTOMATIOD_DO.DONE ||
                                                    AUTOMATIOD_DO[key] === AUTOMATIOD_DO.TODO)) ||
                                            // if the event is marked as to do and action is archive, done, todo
                                            // if you mark a task as todo you cannot immediatelly do these actions
                                            (event === AUTOMATION_EVENT.TODO &&
                                                (AUTOMATIOD_DO[key] === AUTOMATIOD_DO.ARCHIVE ||
                                                    AUTOMATIOD_DO[key] === AUTOMATIOD_DO.DONE ||
                                                    AUTOMATIOD_DO[key] === AUTOMATIOD_DO.TODO)) ||
                                            // if the event is marked as done and action is done, todo
                                            (event === AUTOMATION_EVENT.DONE &&
                                                (AUTOMATIOD_DO[key] === AUTOMATIOD_DO.DONE ||
                                                    AUTOMATIOD_DO[key] === AUTOMATIOD_DO.TODO)) ||
                                            // if the event is based on the start date
                                            (event === AUTOMATION_EVENT.STARTED &&
                                                AUTOMATIOD_DO[key] === AUTOMATIOD_DO.STARTDATE) ||
                                            // if the event is based on the due date
                                            (event === AUTOMATION_EVENT.OVERDUE &&
                                                AUTOMATIOD_DO[key] === AUTOMATIOD_DO.DUEDATE) ||
                                            // if the event is based on the do date
                                            (event === AUTOMATION_EVENT.DO &&
                                                AUTOMATIOD_DO[key] === AUTOMATIOD_DO.DODATE)
                                        ) {
                                            disabled = true;
                                        }

                                        return (
                                            <MenuItem
                                                key={key}
                                                text={AUTOMATIONS_DO_LABELS[AUTOMATIOD_DO[key]]}
                                                icon={
                                                    <Icon icon={AUTOMATION_ACTION_ICON[AUTOMATIOD_DO[key]]} />
                                                }
                                                disabled={disabled}
                                                onClick={() => handleActionChange(AUTOMATIOD_DO[key])}
                                            />
                                        );
                                    }
                                )}
                            </Menu>
                        </Scroller>
                    }
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <Button {...props} variant="minimal" size="small" active={isOpen} ref={ref}>
                            {theAction ? AUTOMATIONS_DO_LABELS[theAction] : translate("Select action")}
                        </Button>
                    )}
                />

                {/* ASSIGN or UNASSIGN */}
                {(theAction === AUTOMATIOD_DO.ASSIGN || theAction === AUTOMATIOD_DO.UNASSIGN) && (
                    <AssigneesPicker
                        assignees={personId ? [personId] : []}
                        onToggle={setPersonId}
                        dismissable
                    >
                        <Button variant="minimal" size="small">
                            {person}
                        </Button>
                    </AssigneesPicker>
                )}

                {/* START or DUE DATES */}
                {(theAction === AUTOMATIOD_DO.STARTDATE ||
                    theAction === AUTOMATIOD_DO.DUEDATE ||
                    theAction === AUTOMATIOD_DO.DODATE) && (
                    <>
                        <span className={Classes.TEXT_DISABLED}>in&nbsp;</span>

                        <NumericInput
                            placeholder="1"
                            min={-1000}
                            max={1000}
                            style={{ width: 50 }}
                            allowNumericCharactersOnly
                            buttonPosition="none"
                            onValueChange={(value: number) => setDays(value)}
                        />

                        <span className={Classes.TEXT_DISABLED}>&nbsp;days</span>
                    </>
                )}

                {/* ADD A TAG */}
                {(theAction === AUTOMATIOD_DO.ADDTAG || theAction === AUTOMATIOD_DO.REMOVETAG) && (
                    <TaskTags value={tags} max={1} onChange={setTags}>
                        <Button variant="minimal" size="small">
                            select tag
                        </Button>
                    </TaskTags>
                )}

                {/* ADD A STATUS */}
                {theAction === AUTOMATIOD_DO.ADDSTATUS && (
                    <StatusPicker onChange={setStatus}>
                        <Button variant="minimal" size="small">
                            {status ? status?.title : "select status"}
                        </Button>
                    </StatusPicker>
                )}

                {/* MOVE TO */}
                {theAction === AUTOMATIOD_DO.MOVE && (
                    <>
                        <span className={Classes.TEXT_DISABLED}>to</span>
                        <StacksPicker
                            value={stack ? [stack] : []}
                            singleSelection
                            onChange={(stacksIds: string[]) => setStack(stacksIds.at(-1))}
                        >
                            <SelectedStackButton stackId={stack} />
                        </StacksPicker>
                    </>
                )}

                {/* PROGRESS TO */}
                {theAction === AUTOMATIOD_DO.PROGRESS && (
                    <>
                        <span className={Classes.TEXT_DISABLED}>to</span>
                        <ProgressPicker value={progress} onChange={setProgress}>
                            <Button variant="minimal" size="small">
                                {progress}%
                            </Button>
                        </ProgressPicker>
                    </>
                )}
            </div>
            <div>
                <Tooltip content={translate("Delete")} placement="top">
                    <Button
                        variant="minimal"
                        size="small"
                        intent={Intent.WARNING}
                        icon={<Icon icon="trash" />}
                        onClick={() => onCancel(action?.id)}
                    />
                </Tooltip>

                <Button
                    variant="minimal"
                    size="small"
                    intent={Intent.SUCCESS}
                    disabled={!canSave}
                    onClick={handleSaveAction}
                >
                    {translate("Save")}
                </Button>
            </div>
        </div>
    );
};

interface ISelectedStackProps {
    stackId?: string;
}
const SelectedStackButton: FunctionComponent<ISelectedStackProps> = ({ stackId }) => {
    const stack = useStack(stackId ?? "");

    return (
        <Button
            variant="minimal"
            size="small"
            icon={stack && <SymbolSquare color={stack.tint || Colors.GRAY3} />}
        >
            {stack ? stack.title : "select stack"}
        </Button>
    );
};
