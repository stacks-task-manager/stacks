// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, Dialog, FormGroup, InputGroup, Intent } from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import { translate } from "@stacks/translations";
import { DEFAULT_WORKBOOK_FILTERS, type IWorkbook, type IWorkbookFilters } from "@stacks/types";

import { Scroller } from "app/components/common";
import { WorkbooksActions } from "app/store/actions";
import { TaskFilter, type WorkbookFilterActions } from "app/widgets";

interface IWorkbookDialogProps {
    isOpen: boolean;
    onClose: () => void;
    workbook?: IWorkbook;
    onSaved?: (workbook: IWorkbook) => void;
}

export const WorkbookDialog: FunctionComponent<IWorkbookDialogProps> = ({
    isOpen,
    onClose,
    workbook,
    onSaved,
}) => {
    const [title, setTitle] = useState("");
    const [filters, setFilters] = useState<IWorkbookFilters>({ ...DEFAULT_WORKBOOK_FILTERS });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setTitle(workbook?.title ?? "");
        setFilters({ ...(workbook?.filters ?? DEFAULT_WORKBOOK_FILTERS) });
    }, [isOpen, workbook?.id, workbook?.updated, workbook?.title, workbook?.filters]);

    const taskFilterActions = useMemo<WorkbookFilterActions>(
        () => ({
            set: (key, value) => setFilters(previous => ({ ...previous, [key]: value }) as IWorkbookFilters),
            setMultiple: values => setFilters(previous => ({ ...previous, ...values })),
        }),
        []
    );

    const save = async () => {
        if (!title.trim() || saving) return;
        setSaving(true);
        try {
            const saved = workbook
                ? await WorkbooksActions.update(workbook.id, { title: title.trim(), filters })
                : await WorkbooksActions.create({
                      title: title.trim(),
                      filters,
                  });
            onSaved?.(saved);
            onClose();
        } catch {
            // Shared API client reports request failures.
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={translate(workbook ? "Edit workbook" : "Add workbook")}
            className="workbook-dialog"
        >
            <Scroller maxHeight={520} vertical thin>
                <div className={Classes.DIALOG_BODY} data-testid="workbook-dialog">
                    <FormGroup label={translate("Title")}>
                        <InputGroup
                            autoFocus
                            value={title}
                            placeholder={translate("Untitled workbook")}
                            onChange={event => setTitle(event.currentTarget.value)}
                            data-testid="workbook-title-input"
                        />
                    </FormGroup>
                    <TaskFilter mode="workbook" filters={filters} actions={taskFilterActions} />
                </div>
            </Scroller>
            <div className="workbook-dialog__footer">
                <Button variant="minimal" onClick={onClose}>
                    {translate("Cancel")}
                </Button>
                <Button
                    intent={Intent.PRIMARY}
                    loading={saving}
                    disabled={!title.trim()}
                    onClick={save}
                    data-testid="workbook-save-button"
                >
                    {translate("Save")}
                </Button>
            </div>
        </Dialog>
    );
};
