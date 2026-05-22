// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    ButtonGroup,
    Checkbox,
    Classes,
    FormGroup,
    Intent,
    Menu,
    MenuItem,
    Popover,
    TextArea,
    Tooltip
} from "@blueprintjs/core";
import { DateInput } from "@blueprintjs/datetime";
import { translate } from "@stacks/translations";
import { ITimeLog } from "@stacks/types";
import { addYears, format, parse } from "date-fns";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";

import { Col, Icon, Row } from "app/components/common";
import { useMe } from "app/hooks";
import { TimelogsActions } from "app/store/actions";
import { formatDuration } from "app/utils/date";
import Toast from "app/utils/toast";
import { DurationInput, ProjectPickerPopup, TaskPickerPopup } from "app/widgets";


export interface IQuickTimeLogProps {
    projectId?: string;
    taskId?: string;
    value?: Partial<ITimeLog> | ITimeLog;
    showTitle?: boolean;
    changeProject?: boolean;
    changeTask?: boolean;
    canSaveAnother?: boolean;
    onSave?: (timelog: ITimeLog, another?: boolean) => void;
    onClose?: () => void;
    onClear?: () => void;
}
export const QuickTimeLog: FunctionComponent<IQuickTimeLogProps> = ({
    projectId,
    taskId,
    value,
    showTitle,
    changeProject,
    changeTask,
    canSaveAnother,
    onSave,
    onClose,
    onClear,
}) => {
    const me = useMe();
    const [project, setProject] = useProject(value?.project ?? projectId);
    const [task, setTask] = useState<string | undefined>(value?.task ?? taskId);
    const [date, setDate] = useState<Date>(value?.date ?? new Date());
    const [duration, setDuration] = useState<number | undefined>(value?.duration);
    const [person, setPerson] = useState<string>(value?.person || me.id);
    const [billable, setBillable] = useState<boolean>(value?.billable || false);
    const [billed, setBilled] = useState<boolean>(value?.billed || false);
    const [description, setDescription] = useState<string>(value?.description || "");

    useEffect(() => {
        if (!person || (person !== me.id)) {
            setPerson(me.id);
        }
    }, [me]);

    useEffect(() => {
        if (projectId && projectId !== project) {
            setProject(projectId);
        }
    }, [projectId])

    const canSave = useMemo(() => {
        return Boolean(duration) && Boolean(date) && Boolean(task) && Boolean(person) && Number(duration) > 0;
    }, [duration, date, task, person]);

    const handleSetProject = (projectId: string) => {
        setProject(projectId);
        setTask(undefined);
    };

    const projectPicker = useMemo(() => {
        if (!changeProject) return null;

        return (
            <FormGroup label="Project">
                <ProjectPickerPopup value={project} matchTargetWidth onChange={handleSetProject} />
            </FormGroup>
        );
    }, [project, changeProject]);

    const taskPicker = useMemo(() => {
        if (!changeTask || !project) return null;

        return (
            <FormGroup label="Task">
                <TaskPickerPopup value={task} projectId={project} onChange={setTask} />
            </FormGroup>
        );
    }, [task, project, changeTask]);

    const formatDate = (date: Date) => {
        return format(date, "P");
    };

    const parseDate = (date: string) => {
        return parse(date, "P", new Date());
    };

    const handleChangeDate = (selectedDate: string | null, isUserChange: boolean) => {
        if (isUserChange && selectedDate) {
            const theDate = new Date(selectedDate);
            if (theDate) {
                setDate(theDate);
                // setDuration(undefined);
            }
        }
    };

    const handleSetBillable = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBillable(event.currentTarget.checked);
        if (!event.currentTarget.checked) {
            setBilled(false);
        }
    };

    const handleSetBilled = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBilled(event.currentTarget.checked);
    };

    const handleChangeDescription = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(event.currentTarget.value);
    };

    const handleSave = async (another?: boolean) => {
        if (!task || !project) return;

        if (value && value.id) {
            const updatedTimelog = {
                ...value,
                date,
                duration,
                billable,
                billed,
                person,
                description,
            };

            await TimelogsActions.update(updatedTimelog as ITimeLog);

            onSave && onSave(updatedTimelog as ITimeLog);
        } else {
            if (!duration) return;
            const timelog = await TimelogsActions.add({
                date,
                duration,
                billable,
                billed,
                description,
                person,
                project,
                task,
            });

            Toast.success("Time log saved successfully");
            onSave && onSave(timelog, another);
        }
    };

    return (
        <div data-testid="quick-timelog">
            {showTitle !== false && <h5 className={Classes.HEADING}>Log time</h5>}
            {projectPicker}
            {taskPicker}
            <Row gutter={15}>
                <Col>
                    <FormGroup label="Date" style={{ width: "100%" }}>
                        <DateInput
                            formatDate={formatDate}
                            parseDate={parseDate}
                            showTimezoneSelect={false}
                            value={date.toJSON()}
                            fill
                            maxDate={addYears(new Date(), 5)}
                            onChange={handleChangeDate}
                        />
                    </FormGroup>
                </Col>

                <Col width={115}>
                    <FormGroup label="Duration">
                        <DurationInput value={duration} onChange={setDuration} />
                    </FormGroup>
                </Col>
            </Row>

            {/* <FormGroup label="Assignee">
                <AssigneesPopover value={person ? [person] : []} onToggle={setPerson}>
                    {person != null ? <AssigneesSync assignees={person ? [person] : []} /> : <RoundButton dashed icon="user-add" tooltip="Assign person" />}
                </AssigneesPopover>
            </FormGroup> */}

            <FormGroup label="Description">
                <TextArea
                    rows={2}
                    placeholder="Add a description"
                    fill
                    value={description}
                    onChange={handleChangeDescription}
                />

                <Row>
                    <Col>
                        <Checkbox label="Billable" checked={billable} onChange={handleSetBillable} />
                    </Col>
                    <Col justify="right">
                        <Tooltip
                            content={`Check this if the time spent (${formatDuration(
                                Number(duration || 0) * 3600
                            )}) was already billed.`}
                            placement="top"
                            hoverOpenDelay={500}
                        >
                            <Checkbox
                                label="Billed"
                                checked={billed}
                                disabled={!billable}
                                onChange={handleSetBilled}
                            />
                        </Tooltip>
                    </Col>
                </Row>
            </FormGroup>

            <Row>
                {onClear && (
                    <Col>
                        <Button
                            minimal
                            small
                            onClick={onClear}
                            intent={Intent.WARNING}
                            className={Classes.POPOVER_DISMISS}
                        >
                            Clear timer
                        </Button>
                    </Col>
                )}
                <Col gap={5} justify="right">
                    <Button
                        variant="minimal"
                        size="small"
                        onClick={onClose ? () => onClose() : undefined}
                        className={Classes.POPOVER_DISMISS}
                        data-testid="quick-timelog-cancel-button"
                    >
                        {translate("Cancel")}
                    </Button>
                    <ButtonGroup>
                        <Button
                            size="small"
                            intent={Intent.PRIMARY}
                            onClick={() => handleSave()}
                            disabled={!canSave}
                            className={Classes.POPOVER_DISMISS}
                            data-testid="quick-timelog-save-button"
                        >
                            {value && value.id ? "Update log" : "Log time"}
                        </Button>
                        {canSaveAnother && value?.id == null && onClear == null ? (
                            <Popover
                                content={
                                    <Menu data-testid="quick-timelog-save-another-menu">
                                        <MenuItem
                                            text="Save and log another"
                                            onClick={() => handleSave(true)}
                                        />
                                    </Menu>
                                }
                                placement="bottom-end"
                                minimal
                                renderTarget={({ isOpen, ref, ...props }) => (
                                    <Button
                                        size="small"
                                        intent={Intent.PRIMARY}
                                        disabled={!canSave}
                                        className={Classes.POPOVER_DISMISS}
                                        active={isOpen}
                                        icon={<Icon icon="chevron-down" />}
                                        ref={ref}
                                        {...props}
                                        data-testid="quick-timelog-save-another-button"
                                    />
                                )}
                            />
                        ) : null}
                    </ButtonGroup>
                </Col>
            </Row>
        </div>
    );
};

const useProject = (projectId?: string) => {
    const slugs = window.location.hash.split("/");
    const currentProject = slugs.at(1) === "project" ? slugs.at(2) : undefined;
    return useState<string | undefined>(projectId ?? currentProject);
};
