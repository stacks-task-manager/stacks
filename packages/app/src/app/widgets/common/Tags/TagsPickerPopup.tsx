// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useCallback, useEffect, useState } from "react";
import { xor } from "lodash";
import { Placement, Popover } from "@blueprintjs/core";

import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { TagsPicker } from "app/components/project";

interface TagsPickerPopupProps {
    section: TAGSECTION;
    value: string[];
    disabled?: boolean;
    placement?: Placement;
    shouldDismissPopover?: boolean;
    type: TAGTYPE;
    children?: React.ReactNode;
    onToggle: (tag: ITag) => void;
}

export const TagsPickerPopup: FunctionComponent<TagsPickerPopupProps> = ({
    section,
    value,
    children,
    placement,
    disabled,
    type,
    onToggle,
}) => {
    return (
        <Popover
            content={<TagsPicker value={value} section={section} type={type} onToggle={onToggle} />}
            placement={placement || "auto"}
            disabled={disabled}
            lazy
        >
            {children}
        </Popover>
    );
};

interface TagsPickerPopupSyncProps {
    section: TAGSECTION;
    value: string[];
    disabled?: boolean;
    placement?: Placement;
    shouldDismissPopover?: boolean;
    children?: React.ReactNode;
    type: TAGTYPE;
    onToggle: (tags: string[]) => void;
}
export const TagsPickerPopupSync: FunctionComponent<TagsPickerPopupSyncProps> = ({
    section,
    value,
    children,
    placement,
    disabled,
    type,
    onToggle,
}) => {
    const [tags, setTags] = useState(value);

    useEffect(() => {
        if (value !== tags) {
            setTags(value);
        }
    }, [value]);

    const handleToggleTag = (tag: ITag) => {
        setTags(xor(tags, [tag.id]));
    };

    const handleSubmitTags = () => {
        onToggle(tags);
    };

    const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);

    return (
        <span onClick={handleClick}>
            <Popover
                content={
                    <TagsPicker
                        value={tags}
                        section={section}
                        onToggle={handleToggleTag}
                        type={type}
                    />
                }
                placement={placement || "auto"}
                disabled={disabled}
                lazy
                onClosing={handleSubmitTags}
            >
                {children}
            </Popover>
        </span>
    );
};
