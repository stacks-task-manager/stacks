// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { TagsPickerPopup } from "app/widgets/common";

interface IStatusPickerProps {
    disabled?: boolean;
    children?: React.ReactNode;
    onChange: (status: ITag) => void;
}
export const StatusPicker: FunctionComponent<IStatusPickerProps> = ({ disabled, children, onChange }) => {
    return (
        <TagsPickerPopup
            value={[]}
            section={TAGSECTION.PROJECTS}
            placement="top"
            disabled={disabled}
            shouldDismissPopover={true}
            type={TAGTYPE.STATUS}
            onToggle={onChange}
        >
            {children}
        </TagsPickerPopup>
    );
};
