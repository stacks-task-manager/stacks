// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import xor from "lodash/xor";
import React, { useCallback, useMemo, useState } from "react";
import { APPICONS, ITableColumns, TreeNode } from "@stacks/types";
import { BlankSlate, Grid, Icon, TablePersistent } from "app/components/common";
import { useArchivedDocuments } from "app/hooks";
import { RecordActions } from "app/store/actions";
import AppDialog from "app/utils/dialog";

export const DocumentsArchiveDialog = ({ onClose }: { onClose: () => void }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [selected, setSelected] = useState<string[]>([]);
    const documents = useArchivedDocuments();

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleLoadArchived = useCallback(async () => {
        await RecordActions.loadArchived()
    }, []);

    const handleSelectTask = useCallback((document: TreeNode) => {
        setSelected(xor(selected, [document.id]));
    }, [setSelected, selected]);

    const handleUnarchive = useCallback(async () => {
        if (selected.length === 0) return;

        const result = await AppDialog.confirm(
            "Unarchive documents",
            "Are you sure you want to unarchive the selected documents?",
            Intent.WARNING
        );

        if (!result) return;

        for (const documentId of selected) {
            await RecordActions.unarchiveDocument(documentId);
        }
        setSelected([]);
    }, [selected]);

    const handleDelete = useCallback(async () => {
        if (selected.length === 0) return;

        const result = await AppDialog.confirm(
            "Delete documents",
            "Are you sure you want to delete the selected documents?",
            Intent.DANGER
        );

        if (!result) return;

        // for (const taskId of selected) {
        //     await TasksActions.remove(taskId);
        // }
        setSelected([]);
    }, [selected]);

    const tableColumns: ITableColumns<TreeNode> = useMemo(
        () => ({
            title: {
                title: "Document",
                width: 400,
                minWidth: 150,
                isSortable: true,
                unhideable: true,
                resizable: true,
            },
            type: {
                title: "Type",
                width: 200,
                minWidth: 100,
                isSortable: false,
                resizable: true,
            },
            archived: {
                title: translate("Archived on"),
                width: 200,
                minWidth: 100,
                isSortable: true,
                resizable: true,
            },
            created: {
                title: translate("Date created"),
                width: 200,
                minWidth: 100,
                isSortable: true,
                resizable: true,
            },
            updated: {
                title: translate("Updated Date"),
                width: 200,
                minWidth: 100,
                isSortable: true,
                resizable: true,
            },
        }),
        []
    );

    return (
        <Dialog title="Archived Documents"
            isOpen={isOpen}
            onOpened={handleLoadArchived}
            onClose={handleClose}
            onClosed={onClose}
            style={{ width: "90vw", height: "90vh" }}
            aria-labelledby="archived-documents-dialog"
        >
            <div className={Classes.DIALOG_BODY}>
                {documents.length > 0 ? (
                    <TablePersistent<TreeNode>
                        id="archived-documents"
                        sticky
                        lazy
                        columns={tableColumns}
                        defaultVisibleColumns={["title", "type", "archived"]}
                        data={documents}
                        // components={{
                        //     cell: TableCell,
                        //     groupAppend: TableGroup,
                        // }}
                        selected={selected}
                        onSelect={handleSelectTask}
                    />
                ) : (
                    <Grid vertical>
                        <BlankSlate
                            icon={APPICONS.ARCHIVED}
                            title="No archived documents"
                            description="There are no archived documents in this project."
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
                                data-testid="archived-documents-dialog-delete-button"
                            >
                                Delete selected ({selected.length})
                            </Button>
                        )}
                    </div>
                    <div>
                        <Button
                            onClick={() => setIsOpen(false)}
                            data-testid="archived-documents-dialog-close-button"
                        >
                            {translate("Close")}
                        </Button>

                        <Button
                            intent={Intent.PRIMARY}
                            disabled={selected.length === 0}
                            onClick={() => handleUnarchive()}
                            data-testid="archived-documents-dialog-restore-button"
                        >
                            Restore{selected.length ? ` ${selected.length}` : ""} documents
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}