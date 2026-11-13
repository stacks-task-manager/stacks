// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, Dialog } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { endOfDay, format, isValid, parseISO, startOfDay } from "date-fns";
import React, { useState } from "react";
import { DateRange, GanttRow } from "app/components/common/GanttChart/types";

export function DateEditor({
    row,
    onClose,
    onSave,
}: {
    row: GanttRow;
    onClose: () => void;
    onSave: (range: DateRange) => Promise<boolean>;
}) {
    const [start, setStart] = useState(format(row.startDate ?? new Date(), "yyyy-MM-dd"));
    const [end, setEnd] = useState(format(row.endDate ?? row.startDate ?? new Date(), "yyyy-MM-dd"));
    const [saving, setSaving] = useState(false);
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const valid = isValid(startDate) && isValid(endDate) && startDate <= endDate;
    return (
        <Dialog
            isOpen
            title={`${translate("Edit dates")} · ${row.name}`}
            onClose={saving ? undefined : onClose}
            canEscapeKeyClose={!saving}
            canOutsideClickClose={!saving}
        >
            <form
                data-testid="gantt-date-editor"
                onSubmit={async event => {
                    event.preventDefault();
                    if (!valid || saving) return;
                    setSaving(true);
                    const success = await onSave({
                        startDate: startOfDay(startDate),
                        endDate: endOfDay(endDate),
                    });
                    setSaving(false);
                    if (success) onClose();
                }}
            >
                <div className={Classes.DIALOG_BODY}>
                    <label className={Classes.LABEL}>
                        {translate("Start date")}
                        <input
                            autoFocus
                            className={Classes.INPUT}
                            type="date"
                            required
                            data-testid="gantt-date-start"
                            value={start}
                            disabled={saving}
                            onChange={event => setStart(event.target.value)}
                        />
                    </label>
                    <label className={Classes.LABEL}>
                        {translate("Due date")}
                        <input
                            className={Classes.INPUT}
                            type="date"
                            required
                            data-testid="gantt-date-end"
                            value={end}
                            min={start}
                            disabled={saving}
                            onChange={event => setEnd(event.target.value)}
                        />
                    </label>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button data-testid="gantt-date-cancel" disabled={saving} onClick={onClose}>
                            {translate("Cancel")}
                        </Button>
                        <Button
                            data-testid="gantt-date-save"
                            type="submit"
                            intent="primary"
                            loading={saving}
                            disabled={!valid}
                        >
                            {translate("Save")}
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    );
}
