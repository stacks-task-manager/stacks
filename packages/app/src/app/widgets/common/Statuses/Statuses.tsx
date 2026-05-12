// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import tinycolor, { ColorInput } from "tinycolor2";

import { ITag } from "@stacks/types";
import { StatusChip } from "app/widgets";

const allColors: ColorInput[] = [];
for (const i in tinycolor.names) {
    allColors.push(i);
}

interface StatusesProps {
    statuses: ITag[];
    confirmRemove?: boolean;
    showParent?: boolean;
    onChange?: (tag: Partial<ITag>) => void;
    onRemove?: (tagId: string) => void;
}

export const Statuses: FunctionComponent<StatusesProps> = ({
    statuses,
    confirmRemove,
    showParent,
    onChange,
    onRemove,
}) => {
    return (
        <>
            {statuses.map((status: ITag) => (
                <StatusChip
                    tag={status}
                    key={status.id}
                    showParent={showParent}
                    confirmRemove={confirmRemove}
                    onChange={onChange}
                    onRemove={onRemove}
                />
            ))}
        </>
    );
};
