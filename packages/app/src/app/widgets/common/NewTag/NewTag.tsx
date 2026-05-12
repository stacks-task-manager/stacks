// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Popover, Tag } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { ITag } from "@stacks/types";
import { TagEdit } from "app/widgets";
import { Plus } from "@blueprintjs/icons";

interface NewTagProps {
    label: React.ReactNode | string;
    isStatus?: boolean;
    hasParent?: boolean;
    onAdd: (tag: Partial<ITag>) => void;
}

export const NewTag: FunctionComponent<NewTagProps> = ({ label, isStatus, hasParent, onAdd }) => {
    return (
        <Popover
            content={<TagEdit onChange={onAdd} previewStatus={isStatus} hasParent={hasParent} shouldDismissPopover />}
            popoverClassName="tag-popover"
            placement="top"
        >
            <Tag minimal round icon={<Plus size={10} />} interactive>
                {label}
            </Tag>
        </Popover>
    );
};
