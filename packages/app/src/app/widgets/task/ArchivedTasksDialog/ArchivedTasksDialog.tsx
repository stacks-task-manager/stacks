// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, ButtonGroup, Classes, Dialog, Intent, Popover } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import xor from "lodash/xor";
import React, { useCallback, useState } from "react";

import { APPICONS, ITask } from "@stacks/types";
import { useArchivedTasks, useCurrentProject } from "app/hooks";
import { TasksActions } from "app/store/actions";
import { StacksMenu, TasksTable } from "app/widgets";

import { BlankSlate, Grid, Icon } from "app/components/common";
import AppDialog from "app/utils/dialog";

export const ArchivedTasksDialog = ({ onClose }: { onClose: () => void }) => {
    const [isOpen, setIsOpen] = useState(true);
    const { project } = useCurrentProject();
    const { tasks } = useArchivedTasks(project?.id);
    const [selected, setSelected] = useState<string[]>([]);

    const handleLoadArchived = async () => {
        if (!project) {
            setIsOpen(false);
            return;
        }
        await TasksActions.loadArchived([project.id]);
    };

    const handleSelectTask = (task: ITask) => {
        setSelected(xor(selected, [task.id]));
    }

    const handleUnarchive = useCallback(async (stackId?: string) => {
        if (selected.length === 0) return;

        const result = await AppDialog.confirm(
            "Unarchive tasks",
            "Are you sure you want to unarchive the selected tasks?",
            Intent.WARNING
        );

        if (!result) return;

        for (const taskId of selected) {
            await TasksActions.unarchive(taskId, stackId);
        }
        setSelected([]);
    }, [selected]);

    const handleDelete = useCallback(async () => {
        if (selected.length === 0) return;

        const result = await AppDialog.confirm(
            "Delete tasks",
            "Are you sure you want to delete the selected tasks?",
            Intent.DANGER
        );

        if (!result) return;

        for (const taskId of selected) {
            await TasksActions.remove(taskId);
        }
        setSelected([]);
    }, [selected]);

    return (
        <Dialog title="Archived Tasks" isOpen={isOpen}
            onOpened={handleLoadArchived}
            onClose={() => setIsOpen(false)}
            onClosed={onClose}
            style={{ width: "90vw", height: "90vh" }}
        >
            <div className={Classes.DIALOG_BODY}>
                {tasks.length > 0 ? (
                    <TasksTable
                        id="archived-tasks-table"
                        tasks={tasks}
                        extraColumns={{
                            archived: {
                                title: translate("Archived on"),
                                width: 200,
                                minWidth: 100,
                                isSortable: true,
                                resizable: true,
                            }
                        }}
                        selected={selected}
                        onSelect={handleSelectTask}
                    />
                ) : (
                    <Grid vertical>
                        <BlankSlate
                            icon={APPICONS.ARCHIVED}
                            title="No archived tasks"
                            description="There are no archived tasks in this project."
                        />
                    </Grid>
                )}
            </div>

            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS} style={{ justifyContent: "space-between" }}>
                    <div>
                        {selected.length > 0 && (
                            <Button
                                style={{ marginLeft: 0 }}
                                intent={Intent.DANGER}
                                icon={<Icon icon="trash" />}
                                onClick={handleDelete}
                            >
                                Delete selected ({selected.length})
                            </Button>
                        )}
                    </div>
                    <div>
                        <Button
                            onClick={() => setIsOpen(false)}
                        >
                            {translate("Close")}
                        </Button>
                        <ButtonGroup>
                            <Button
                                intent={Intent.PRIMARY}
                                disabled={selected.length === 0}
                                onClick={() => handleUnarchive()}
                            >
                                Restore{selected.length ? ` ${selected.length}` : ""} tasks
                            </Button>
                            <Popover
                                content={project && <StacksMenu
                                    projectId={project.id}
                                    showTitle
                                    onClick={handleUnarchive}
                                    selected={undefined}
                                    nested
                                />}
                                placement="left-end"
                                renderTarget={({ isOpen, ...props }) => (
                                    <Button
                                        intent={Intent.PRIMARY}
                                        disabled={selected.length === 0}
                                        icon={<Icon icon="chevron-down" />}
                                        style={{ marginLeft: 0 }}
                                        active={isOpen}
                                        {...props}
                                    />
                                )}
                            />

                        </ButtonGroup>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}