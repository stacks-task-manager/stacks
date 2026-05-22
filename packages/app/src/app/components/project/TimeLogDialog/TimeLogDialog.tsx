// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo, useState } from "react";
import {
    Button,
    Checkbox,
    Classes,
    Dialog,
    Intent,
    Menu,
    MenuItem,
    NumericInput,
    Popover,
} from "@blueprintjs/core";

import { Grid, Textarea, Icon, RoundButton, Row, Col } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { TimelogsActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { IPerson, ITask, TreeNode } from "@stacks/types";
import { RecordsStore } from "app/store/records";
import { differenceInMilliseconds } from "date-fns";
import { Assignees, PeopleDialog } from "app/widgets";

export type TimeLogDialogCloseOp = "close" | "stop";

interface ITimeLogDialogProps {
    task: ITask;
    time: number;
    onClose: (op: TimeLogDialogCloseOp) => void;
}
export const TimeLogDialog: FunctionComponent<ITimeLogDialogProps> = ({ task, time, onClose }) => {
    const me = PeopleStore.get().me;
    const [open, setOpen] = useState(true);
    const [hours, setHours] = useState(
        (differenceInMilliseconds(new Date(), new Date(time * 1000)) / (1000 * 60 * 60)).toFixed(2)
    );
    const [showPeoplePicker, setShowPeoplePicker] = useState(false);
    const [closeOp, setCloseOp] = useState<TimeLogDialogCloseOp>("close");
    const [description, setDescription] = useState("");
    const [assignees, setAssignees] = useState<string[]>(me ? [me] : []);
    const [billable, setBillable] = useState(false);
    const [project, setProject] = useState<string | undefined>(undefined);

    const projects = useMemo(() => {
        const { documents } = RecordsStore.get();

        const projects = documents.filter(doc => doc.type === "project");
        const currentProject = projects.find(doc => task?.project === `${doc.id}`);

        if (currentProject && currentProject.id) {
            setProject(`${currentProject.id}`);
        }

        return projects;
    }, [task]);

    const selectedProjectTitle = useMemo(() => {
        if (!project) return "Select project";
        const selectedProject = projects.find(p => p.id === project);
        return selectedProject!.text;
    }, [project]);

    const peopleList = useMemo(() => {
        const { people } = PeopleStore.get();
        return people ? people.filter((person: IPerson) => assignees.includes(person.id)) : [];
    }, [assignees]);

    const handleChangeHours = (valueAsNumber: number, valueAsString: string) => {
        setHours(valueAsString);
    };

    const handleChangeDescription = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(event.currentTarget.value);
    };

    const handleSetBillable = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBillable(event.currentTarget.checked);
    };

    const handleClosed = () => {
        onClose(closeOp);
    };

    const handleCloseDialog = () => {
        setOpen(false);
    };

    const handleStop = () => {
        setCloseOp("stop");
        handleCloseDialog();
    };

    const handleClose = () => {
        setCloseOp("close");
        handleCloseDialog();
    };

    const handleSave = () => {
        if (!hours || !project) return;

        for (const assignee of assignees) {
            TimelogsActions.add({
                duration: Number(hours) * 3600, // Convert hours to seconds
                date: new Date(),
                person: assignee,
                description,
                billable,
                project,
                task: task.id,
            });
        }

        handleStop();
    };

    return (
        <Dialog
            isOpen={open}
            lazy
            title="Log time"
            className="timer-log-dialog"
            onClose={handleCloseDialog}
            onClosed={handleClosed}
            aria-labelledby="timelog-dialog"
        >
            {task && (
                <>
                    <Grid padding={[20, 30]} gap={20}>
                        <TaskDetailsSection title="Task" vertical>
                            {task.title}
                        </TaskDetailsSection>

                        <Row gutter={20}>
                            <Col width={200}>
                                <TaskDetailsSection title="Elapsed time" vertical>
                                    <NumericInput
                                        value={hours}
                                        allowNumericCharactersOnly
                                        min={0}
                                        majorStepSize={1}
                                        minorStepSize={0.5}
                                        buttonPosition="none"
                                        fill
                                        placeholder="1.5 hrs"
                                        onValueChange={handleChangeHours}
                                    />
                                </TaskDetailsSection>
                            </Col>
                            <Col width={250}>
                                <TaskDetailsSection title="Assign to" vertical>
                                    {assignees.length === 0 && (
                                        <RoundButton
                                            dashed
                                            title="Add people"
                                            onClick={() => setShowPeoplePicker(true)}
                                        />
                                    )}

                                    {assignees.length > 0 && (
                                        <Assignees
                                            assignees={peopleList}
                                            max={3}
                                            interractive
                                            onClick={() => setShowPeoplePicker(true)}
                                        />
                                    )}

                                    {showPeoplePicker && (
                                        <PeopleDialog
                                            value={assignees}
                                            onClosed={() => setShowPeoplePicker(false)}
                                            onClose={setAssignees}
                                        />
                                    )}
                                </TaskDetailsSection>
                            </Col>
                            <Col>
                                <TaskDetailsSection title="Project" vertical>
                                    <Popover
                                        content={
                                            <Menu>
                                                {projects.map((project: TreeNode) => (
                                                    <MenuItem
                                                        key={project.id}
                                                        text={project.text}
                                                        onClick={() => setProject(`${project.id}`)}
                                                    />
                                                ))}
                                            </Menu>
                                        }
                                        fill
                                    >
                                        <Button alignText="left">{selectedProjectTitle}</Button>
                                    </Popover>
                                </TaskDetailsSection>
                            </Col>
                        </Row>

                        <TaskDetailsSection title="Description" vertical>
                            <Textarea
                                value={description}
                                onChange={handleChangeDescription}
                                placeholder="Add a description"
                                minRows={4}
                                style={{ width: "100%" }}
                            />
                        </TaskDetailsSection>
                        <Checkbox label="Billable" checked={billable} onChange={handleSetBillable} />
                    </Grid>
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <div>
                                <Button intent={Intent.DANGER} variant="minimal" onClick={handleStop}
                                    data-testid="timelog-dialog-cancel-button"
                                >
                                    Cancel timer
                                </Button>
                            </div>
                            <div>
                                <Button onClick={handleClose} variant="minimal"
                                    data-testid="timelog-dialog-continue-button"
                                >
                                    Continue logging
                                </Button>

                                <Button
                                    intent={Intent.SUCCESS}
                                    icon={<Icon icon="save-02" />}
                                    disabled={!hours || !project}
                                    onClick={handleSave}
                                    data-testid="timelog-dialog-save-button"
                                >
                                    Save log
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </Dialog>
    );
};
