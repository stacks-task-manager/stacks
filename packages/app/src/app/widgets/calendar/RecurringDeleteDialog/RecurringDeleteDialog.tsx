// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import React, { FunctionComponent, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

export type RecurringDeleteScope = "single" | "series";

interface RecurringDeleteDialogProps {
    onClose: (scope: RecurringDeleteScope | null) => void;
}

export const RecurringDeleteDialog: FunctionComponent<RecurringDeleteDialogProps> = ({ onClose }) => {
    const [isOpen, setIsOpen] = useState(true);
    const result = useRef<RecurringDeleteScope | null>(null);

    const handleClose = (scope: RecurringDeleteScope | null) => {
        result.current = scope;
        setIsOpen(false);
    };

    return (
        <Dialog
            isOpen={isOpen}
            canEscapeKeyClose
            canOutsideClickClose
            title="Delete recurring event"
            onClose={() => handleClose(null)}
            onClosed={() => onClose(result.current)}
        >
            <div className={Classes.DIALOG_BODY}>
                <p>This event is part of a series. What would you like to delete?</p>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button
                        data-testid="recurring-delete-cancel"
                        variant="minimal"
                        onClick={() => handleClose(null)}
                    >
                        Cancel
                    </Button>
                    <Button
                        data-testid="recurring-delete-single"
                        intent={Intent.DANGER}
                        onClick={() => handleClose("single")}
                    >
                        Only this event
                    </Button>
                    <Button
                        data-testid="recurring-delete-series"
                        intent={Intent.DANGER}
                        onClick={() => handleClose("series")}
                    >
                        Entire series
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export const showRecurringDeleteDialog = (): Promise<RecurringDeleteScope | null> => {
    return new Promise(resolve => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const root = createRoot(container);

        const handleResolve = (scope: RecurringDeleteScope | null) => {
            resolve(scope);
            root.unmount();
            document.body.removeChild(container);
        };

        root.render(<RecurringDeleteDialog onClose={handleResolve} />);
    });
};
