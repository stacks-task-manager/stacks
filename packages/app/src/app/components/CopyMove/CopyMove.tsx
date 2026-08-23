// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Callout,
    Checkbox,
    Classes,
    Collapse,
    Dialog,
    FormGroup,
    HTMLSelect,
    Intent,
    Switch,
    Tooltip,
} from "@blueprintjs/core";
import React, { useEffect, useMemo, useState } from "react";
import { COPYMOVEACTION, COPYMOVETYPE, IStack, TreeNode } from "@stacks/types";
import { getProjectStacks, useCurrentProject, useProjectDocuments } from "app/hooks";
import { StacksActions, TasksActions } from "app/store/actions";
import { CopyMoveActions } from "app/store/actions/copymove";
import { CopyMoveStore } from "app/store/copymove";
import { Col, Icon, Row } from "../common";

/** Field-name → store action for the copy-scope checkboxes. */
const COPY_FIELDS = {
    cover: CopyMoveActions.setCover,
    attachments: CopyMoveActions.setAttachments,
    timelogs: CopyMoveActions.setTimelogs,
    comments: CopyMoveActions.setComments,
    subtasks: CopyMoveActions.setSubtasks,
};

export const CopyMoveWrapper = () => {
    const { isVisible } = CopyMoveStore.use();
    if (!isVisible) return null;
    return <CopyMove />;
};

const CopyMove = () => {
    const [processing, setProcessing] = useState(false);
    const [open, setOpen] = useState(true);
    const [stacks, setStacks] = useState<IStack[]>([]);
    const { project: currentProject } = useCurrentProject();
    const {
        title,
        action,
        after,
        type,
        project,
        stack,
        tasks,
        keepSettings,
        cover,
        attachments,
        timelogs,
        comments,
        subtasks,
    } = CopyMoveStore.use();

    const projects = useProjectDocuments();

    const dialogTitle = useMemo(() => {
        return `${action === COPYMOVEACTION.COPY ? translate("Copy label") : translate("Move label")} ${
            tasks.length > 1 ? `${tasks.length} tasks` : title
        }`;
    }, [tasks, title, action]);

    useEffect(() => {
        if (type === COPYMOVETYPE.STACK) return;
        if (project == null) {
            setStacks([]);
        } else {
            (async () => {
                const loadedStacks = getProjectStacks(project);
                setStacks(loadedStacks);
            })();
        }
    }, [project, type]);

    const handleChangeProject = (event: React.ChangeEvent<HTMLSelectElement>) => {
        CopyMoveActions.setProject(
            event.currentTarget.value && event.currentTarget.value.length
                ? event.currentTarget.value
                : undefined
        );
    };

    const handleChangeStack = (event: React.ChangeEvent<HTMLSelectElement>) => {
        CopyMoveActions.setStack(event.currentTarget.value);
    };

    const handleChangePosition = (event: React.ChangeEvent<HTMLInputElement>) => {
        CopyMoveActions.setPosition(event.currentTarget.checked);
    };

    const handleChangeCheckbox = (field: keyof typeof COPY_FIELDS) => {
        return (event: React.ChangeEvent<HTMLInputElement>) => {
            COPY_FIELDS[field](event.currentTarget.checked);
        };
    };

    const handleChangeKeepSettings = () => {
        CopyMoveActions.setKeepSettings(!keepSettings);
    };

    const canProceed = useMemo(() => {
        if (type === COPYMOVETYPE.TASK) {
            return (
                action != null && tasks.length > 0 && project != null && project.length > 0 && stack != null
            );
        }

        return action != null && stack != null && project != null;
    }, [action, stack, tasks, project, type]);

    const handleCopyOrMove = async () => {
        if (!canProceed) return;
        if (stack == null || project == null) return;

        setProcessing(true);
        let processed = false;

        if (type === COPYMOVETYPE.TASK && tasks.length > 0) {
            if (action === COPYMOVEACTION.COPY) {
                processed = await TasksActions.copy();
            } else {
                processed = await TasksActions.move();
            }
        } else {
            if (action === COPYMOVEACTION.COPY) {
                processed = await StacksActions.copy();
            } else {
                processed = await StacksActions.move();
            }
        }

        if (processed) {
            window.toaster.show({
                message: `The ${type === COPYMOVETYPE.TASK ? "task" : "stack"} was ${
                    action === COPYMOVEACTION.COPY ? "copied" : "moved"
                } successfully!`,
                intent: Intent.SUCCESS,
                icon: "tick",
            });
        }

        setProcessing(false);

        handleClose();
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleClosed = () => {
        CopyMoveActions.hide();
    };

    return (
        <Dialog
            isOpen={open}
            onClose={handleClose}
            onClosed={handleClosed}
            title={dialogTitle}
            style={{ width: 300 }}
        >
            <div className={Classes.DIALOG_BODY}>
                <FormGroup label={translate("Select action")}>
                    <Row gutter={15}>
                        <Col>
                            <Button
                                className="big"
                                variant={action === COPYMOVEACTION.COPY ? "solid" : "outlined"}
                                intent={action === COPYMOVEACTION.COPY ? Intent.PRIMARY : Intent.NONE}
                                onClick={() => CopyMoveActions.setAction(COPYMOVEACTION.COPY)}
                                disabled
                                data-testid="copymove-action-copy"
                            >
                                <Icon icon="copy" />
                                {translate("Copy")}
                            </Button>
                        </Col>
                        <Col>
                            <Button
                                className="big"
                                variant={action === COPYMOVEACTION.MOVE ? "solid" : "outlined"}
                                intent={action === COPYMOVEACTION.MOVE ? Intent.PRIMARY : Intent.NONE}
                                onClick={() => CopyMoveActions.setAction(COPYMOVEACTION.MOVE)}
                                data-testid="copymove-action-move"
                            >
                                <Icon icon="move" />
                                {translate("Move")}
                            </Button>
                        </Col>
                    </Row>
                </FormGroup>

                <Collapse isOpen={action != null}>
                    <FormGroup label={translate("Destination Project")} labelFor="text-input">
                        <HTMLSelect
                            className={Classes.FILL}
                            onChange={handleChangeProject}
                            value={project}
                            data-testid="copymove-project-select"
                        >
                            <option></option>

                            {projects.map((record: TreeNode) => {
                                return (
                                    <option
                                        key={record.id}
                                        value={record.id}
                                        disabled={
                                            action === COPYMOVEACTION.MOVE && record.id === currentProject?.id
                                        }
                                    >
                                        {record.title}
                                    </option>
                                );
                            })}
                        </HTMLSelect>
                    </FormGroup>
                </Collapse>

                <Collapse isOpen={project != null}>
                    {type === COPYMOVETYPE.TASK && (
                        <FormGroup label={translate("Destination Stack")} labelFor="text-input">
                            <HTMLSelect
                                className={Classes.FILL}
                                onChange={handleChangeStack}
                                value={stack}
                                data-testid="copymove-stack-select"
                            >
                                {stacks.map((stack: IStack) => {
                                    return (
                                        <option key={stack.id} value={stack.id}>
                                            {stack.title}
                                        </option>
                                    );
                                })}
                            </HTMLSelect>
                        </FormGroup>
                    )}

                    {action === COPYMOVEACTION.COPY ? (
                        <React.Fragment>
                            <Row gutter={10}>
                                <Col>
                                    <Checkbox
                                        label={translate("Cover image")}
                                        checked={cover}
                                        onChange={handleChangeCheckbox("cover")}
                                        data-testid="copymove-cover"
                                    />
                                </Col>
                                <Col>
                                    <Checkbox
                                        label={translate("Attachments")}
                                        checked={attachments}
                                        onChange={handleChangeCheckbox("attachments")}
                                        data-testid="copymove-attachments"
                                    />
                                </Col>
                            </Row>
                            <Row gutter={10}>
                                <Col>
                                    <Checkbox
                                        label={translate("Timelogs")}
                                        checked={timelogs}
                                        onChange={handleChangeCheckbox("timelogs")}
                                        data-testid="copymove-timelogs"
                                    />
                                </Col>
                                <Col>
                                    <Checkbox
                                        label={translate("Comments")}
                                        checked={comments}
                                        onChange={handleChangeCheckbox("comments")}
                                        data-testid="copymove-comments"
                                    />
                                </Col>
                            </Row>

                            <Checkbox
                                label={translate("Subtasks")}
                                checked={subtasks}
                                onChange={handleChangeCheckbox("subtasks")}
                                data-testid="copymove-subtasks"
                            />

                            {/* {subtasks ? (
                                <Callout intent={Intent.PRIMARY}>
                                    All task&apos;s subtasks will be also copied to the destination stack.
                                </Callout>
                            ) : null} */}
                        </React.Fragment>
                    ) : null}

                    <br />
                    <Row>
                        <Col justify="center">
                            {type === COPYMOVETYPE.TASK ? translate("Top") : translate("First")}
                            <Switch
                                checked={after}
                                onChange={handleChangePosition}
                                style={{ marginLeft: 10 }}
                            />
                            {type === COPYMOVETYPE.TASK ? translate("Bottom") : translate("Last")}
                        </Col>
                    </Row>
                </Collapse>
            </div>

            {type === COPYMOVETYPE.STACK && canProceed && (
                <div className={Classes.DIALOG_BODY}>
                    <Callout intent={Intent.WARNING}>
                        By copying or moving a stack it will also copy or move all its tasks to the new
                        destination.
                    </Callout>
                </div>
            )}

            <div className={Classes.DIALOG_FOOTER}>
                <div className="dialog-footer-actions">
                    <Checkbox checked={keepSettings} onChange={handleChangeKeepSettings}>
                        {translate("Remember")}{" "}
                        <Tooltip content={translate("Remember copy move settings hint")}>
                            <Icon icon="info-circle" size={14} />
                        </Tooltip>
                    </Checkbox>

                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button variant="minimal" onClick={handleClose}>
                            {translate("Cancel")}
                        </Button>
                        <Button
                            intent={Intent.PRIMARY}
                            disabled={!canProceed}
                            loading={processing}
                            onClick={handleCopyOrMove}
                            data-testid="copymove-confirm-button"
                        >
                            {action === COPYMOVEACTION.COPY ? translate("Copy") : translate("Move")}
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};
