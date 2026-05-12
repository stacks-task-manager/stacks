// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Dialog } from "@blueprintjs/core";

import React, { FunctionComponent, useRef, useState } from "react";

import { ITimeLog } from "@stacks/types";
import { IQuickTimeLogProps, QuickTimeLog } from "./QuickTimeLog";

export const QuickTimeLogDialog: FunctionComponent<IQuickTimeLogProps> = ({ onSave, onClose, ...props }) => {
    const [open, setOpen] = useState(true);
    const anotherRef = useRef<boolean | undefined>();

    const handleCloseDialog = () => {
        setOpen(false);
    };

    const handleSave = (timelog: ITimeLog, another?: boolean) => {
        anotherRef.current = another;
        onSave && onSave(timelog, another);
        setOpen(false);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleClosed = () => {
        if (anotherRef.current === true) {
            setOpen(true);
            anotherRef.current = false;
        } else {
            onClose && onClose();
        }
    };

    return (
        <Dialog
            title="Log time"
            isOpen={open}
            style={{ width: 300, paddingBottom: 0 }}
            onClose={handleCloseDialog}
            onClosed={handleClosed}
            lazy
            aria-labelledby="timelog-dialog"
        >
            <div className={Classes.DIALOG_BODY}>
                <QuickTimeLog
                    canSaveAnother
                    showTitle={false}
                    onSave={handleSave}
                    onClose={handleClose}
                    {...props}
                />
            </div>
        </Dialog>
    );
};
