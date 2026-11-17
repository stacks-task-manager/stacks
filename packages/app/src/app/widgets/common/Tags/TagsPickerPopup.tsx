// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useCallback, useState } from "react";
import { xor } from "lodash";
import { Placement, Popover } from "@blueprintjs/core";

import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { TagsPicker } from "app/components/project";

interface TagsPickerPopupBaseProps {
    section: TAGSECTION;
    value: string[];
    disabled?: boolean;
    placement?: Placement;
    type: TAGTYPE;
    children?: React.ReactNode;
}

interface ImmediateTagsPickerPopupProps extends TagsPickerPopupBaseProps {
    commitMode?: "immediate";
    onToggle: (tag: ITag) => void;
}

interface BatchedTagsPickerPopupProps extends TagsPickerPopupBaseProps {
    commitMode: "onClose";
    onToggle: (tagIds: string[]) => void;
}

type TagsPickerPopupProps = ImmediateTagsPickerPopupProps | BatchedTagsPickerPopupProps;

export const TagsPickerPopup: FunctionComponent<TagsPickerPopupProps> = props => {
    const { section, value, children, placement, disabled, type, commitMode = "immediate" } = props;
    const [selected, setSelected] = useState(value);

    const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);

    const handleToggleTag = (tag: ITag) => {
        if (props.commitMode === "onClose") {
            setSelected(current => xor(current, [tag.id]));
            return;
        }

        props.onToggle(tag);
    };

    const handleSubmitTags = () => {
        if (props.commitMode === "onClose") {
            props.onToggle(selected);
        }
    };

    const popup = (
        <Popover
            content={
                <TagsPicker
                    value={commitMode === "onClose" ? selected : value}
                    section={section}
                    onToggle={handleToggleTag}
                    type={type}
                />
            }
            placement={placement || "auto"}
            disabled={disabled}
            lazy
            onOpening={commitMode === "onClose" ? () => setSelected(value) : undefined}
            onClosing={commitMode === "onClose" ? handleSubmitTags : undefined}
        >
            {children}
        </Popover>
    );

    return commitMode === "onClose" ? <span onClick={handleClick}>{popup}</span> : popup;
};
