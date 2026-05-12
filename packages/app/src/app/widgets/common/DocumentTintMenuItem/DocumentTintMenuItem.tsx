// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { Icon } from "app/components/common";
import { TintPicker } from "app/components/project";
import { useDocument } from "app/hooks";
import { RecordActions } from "app/store/actions";
import { MenuItem } from "@blueprintjs/core";

interface DocumentTintMenuItemProps {
    documentId: string;
}
export const DocumentTintMenuItem: FunctionComponent<DocumentTintMenuItemProps> = ({ documentId }) => {
    const document = useDocument(documentId);
    if (document == null) return null;

    const handleChangeTint = (color?: string) => {
        RecordActions.setTint(document.id, color);
    };

    return (
        <MenuItem text="Tint" icon={<Icon icon="palette" />}>
            <TintPicker canClear value={document.tint} onChange={handleChangeTint} />
        </MenuItem>
    );
};
