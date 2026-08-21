// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import React from "react";
import { TagSectionMenu } from "../TagSectionMenu/TagSectionMenu";

interface IStatusesMenuProps {
    value: ITag[];
    shouldDismiss?: boolean;
    section: TAGSECTION;
    onChange: (status?: ITag) => void;
}
export const StatusesMenu = React.memo(function StatusesMenu({
    value,
    shouldDismiss,
    section,
    onChange,
}: IStatusesMenuProps) {
    return (
        <TagSectionMenu
            type={TAGTYPE.STATUS}
            value={value.map((status: ITag) => status.id)}
            shouldDismiss={shouldDismiss}
            section={section}
            onChange={onChange}
        />
    );
});
