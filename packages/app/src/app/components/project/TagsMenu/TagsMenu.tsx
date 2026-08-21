// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import React from "react";
import { TagSectionMenu } from "../TagSectionMenu/TagSectionMenu";

interface ITagsMenuProps {
    value: string[];
    shouldDismiss?: boolean;
    section: TAGSECTION;
    onChange: (tag?: ITag) => void;
}
export const TagsMenu = React.memo(function TagsMenu({
    value,
    shouldDismiss,
    section,
    onChange,
}: ITagsMenuProps) {
    return (
        <TagSectionMenu
            type={TAGTYPE.TAG}
            value={value}
            shouldDismiss={shouldDismiss}
            section={section}
            onChange={onChange}
        />
    );
});
