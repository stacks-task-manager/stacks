// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { MaybeElement } from "@blueprintjs/core";
import { AssigneesPopover } from "../AssigneesPopover/AssigneesPopover";

interface IAssigneesPickerProps {
    assignees: string[];
    children?: MaybeElement;
    dismissable?: boolean;
    onToggle: (personId: string) => void;
    onClear?: () => void;
}
export const AssigneesPicker: FunctionComponent<IAssigneesPickerProps> = ({
    assignees,
    children,
    dismissable,
    onToggle,
    onClear,
}) => {
    return (
        <AssigneesPopover
            value={assignees}
            dismissable={dismissable}
            onToggle={onToggle}
            onClear={onClear}
        >
            {children}
        </AssigneesPopover>
    );
};
