// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Placement, Popover } from "@blueprintjs/core";

import { TagEdit, TagEditProps } from "../TagEdit/TagEdit";

interface ITagPopoverProps extends TagEditProps {
    children?: React.ReactNode;
    placement?: Placement;
}
export const TagEditPopover: React.FunctionComponent<ITagPopoverProps> = ({
    tag,
    children,
    placement,
    onChange,
}) => {
    return (
        <Popover
            content={<TagEdit tag={tag} onChange={onChange} shouldDismissPopover />}
            placement={placement || "top"}
        >
            {children}
        </Popover>
    );
};
