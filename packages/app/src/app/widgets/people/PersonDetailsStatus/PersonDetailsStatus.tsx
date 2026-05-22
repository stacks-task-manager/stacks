// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { RoundButton } from "app/components/common";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { TagsWrapper, TagsPickerPopup, Status } from "app/widgets/common";
import { useElementHotkey } from "app/hooks";

interface PersonDetailsStatusProps {
    value?: string;
    onToggle: (status: ITag) => void;
}
export const PersonDetailsStatus: FunctionComponent<PersonDetailsStatusProps> = ({ value, onToggle }) => {
    useElementHotkey("shift+s", "td-status", true);

    return (
        <TagsWrapper>
            <TagsPickerPopup
                value={value ? [value] : []}
                section={TAGSECTION.PEOPLE}
                onToggle={onToggle}
                type={TAGTYPE.STATUS}
            >
                <RoundButton dashed icon="circle" id="td-status" tooltip={translate("Add status")} />
            </TagsPickerPopup>
            {value ? <Status status={value} section={TAGSECTION.PEOPLE} /> : null}
        </TagsWrapper>
    );
};
