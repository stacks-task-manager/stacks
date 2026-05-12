// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import xor from "lodash/xor";
import React, { FunctionComponent, useMemo } from "react";
import { RoundButton } from "app/components/common";
import { Tags, TagsPickerPopupSync, TagsWrapper } from "app/widgets";
import { TAGSECTION, TAGTYPE } from "@stacks/types";

interface ITaskTagsProps {
    value: string[];
    disabled?: boolean;
    minimal?: boolean;
    nowrap?: boolean;
    children?: React.ReactNode;
    id?: string;
    max?: number;
    onChange: (tags: string[]) => void;
}
const TaskTagsRaw: FunctionComponent<ITaskTagsProps> = ({
    value,
    disabled,
    minimal,
    nowrap,
    children,
    id,
    max,
    onChange,
}) => {
    const tooltip = useMemo(() => {
        if (value.length > 0) return translate("Add more tags");
        return minimal ? translate("Add tags") : undefined;
    }, [value.length, minimal]);

    const icon = useMemo(() => {
        if (value.length > 0) return "plus";
        return minimal ? "tag" : undefined;
    }, [value.length, minimal]);

    const handleRemoveTag = (tag: string) => {
        onChange(xor(value, [tag]));
    };

    return (
        <TagsWrapper nowrap={nowrap}>
            {!disabled && (<TagsPickerPopupSync
                value={value}
                type={TAGTYPE.TAG}
                section={TAGSECTION.PROJECTS}
                placement="top"
                disabled={disabled}
                onToggle={onChange}
            >
                {children ? (
                    children
                ) : (
                    <RoundButton
                        id={id}
                        dashed
                        disabled={disabled}
                        title={value.length > 0 || minimal ? undefined : translate("Add tags")}
                        tooltip={tooltip}
                        icon={icon}
                    />
                )}
            </TagsPickerPopupSync>)}
            <Tags
                value={value}
                section={TAGSECTION.PROJECTS}
                onRemove={disabled ? undefined : handleRemoveTag}
                max={max ?? 3}
            />
        </TagsWrapper>
    );
};

export const TaskTags = React.memo(TaskTagsRaw);
