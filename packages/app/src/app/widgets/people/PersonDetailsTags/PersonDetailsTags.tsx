// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { RoundButton } from "app/components/common";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { TagsWrapper, TagsPickerPopup, Tags } from "app/widgets/common";
import { useElementHotkey } from "app/hooks";

interface PersonDetailsTagsProps {
    tags: string[];
    onToggle: (tag: ITag) => void;
}
export const PersonDetailsTags: FunctionComponent<PersonDetailsTagsProps> = ({ tags, onToggle }) => {
    useElementHotkey("shift+t", "pd-tags", true);
    return (
        <TagsWrapper>
            <TagsPickerPopup type={TAGTYPE.TAG} value={tags} section={TAGSECTION.PEOPLE} onToggle={onToggle}>
                <RoundButton dashed tooltip={translate("Add more tags")} id="pd-tags" />
            </TagsPickerPopup>
            <Tags value={tags} section={TAGSECTION.PEOPLE} />
        </TagsWrapper>
    );
};
