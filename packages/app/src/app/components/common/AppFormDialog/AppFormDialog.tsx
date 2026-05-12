// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Dialog, type DialogProps } from "@blueprintjs/core";
import React, { ReactNode } from "react";

export type AppFormDialogProps = {
    /** Props forwarded to Blueprint `Dialog` (excluding `children`). */
    dialogProps: Omit<DialogProps, "children">;
    /** Main form content (wrapped in `Classes.DIALOG_BODY`). */
    children: ReactNode;
    /** Optional footer (e.g. `Classes.DIALOG_FOOTER`); not wrapped. */
    footer?: ReactNode;
    /** Override body wrapper class (defaults to `Classes.DIALOG_BODY`). */
    bodyClassName?: string;
};

/**
 * Shared Blueprint dialog shell: consistent body wrapper for form-style modals.
 */
export function AppFormDialog({ dialogProps, children, footer, bodyClassName }: AppFormDialogProps) {
    return (
        <Dialog {...dialogProps}>
            <div className={bodyClassName ?? Classes.DIALOG_BODY}>{children}</div>
            {footer}
        </Dialog>
    );
}
