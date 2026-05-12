// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Tag, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { ITag } from "@stacks/types";
import { adjustColor, colorToRGBA } from "app/utils/colors";
import Dialog from "app/utils/dialog";
import { TagEditPopover } from "../TagEditPopover/TagEditPopover";
import { FullCircle } from "@blueprintjs/icons";
import { Icon } from "app/components/common";

export interface StatusChipProps {
    tag: ITag;
    interactive?: boolean;
    confirmRemove?: boolean;
    disabled?: boolean;
    fill?: boolean;
    showParent?: boolean;
    tagId?: string; // used to set a specific element ID on the tag in order to be clickable from the hotkey manager
    onRemove?: (tagId: string) => void;
    onChange?: (tag: Partial<ITag>) => void;
}
export const StatusChip: FunctionComponent<StatusChipProps> = ({
    tag,
    confirmRemove,
    disabled,
    interactive,
    fill,
    showParent,
    tagId,
    onRemove,
    onChange,
}) => {
    const handleRemove = async (event: React.MouseEvent) => {
        event.stopPropagation();

        if (confirmRemove) {
            const confirm: boolean = await Dialog.confirm(
                translate("Delete status"),
                translate("Are you sure you want to delete this status You will also lose any reference were it was assigned")
            );
            if (confirm && onRemove) {
                onRemove(tag.id);
            }
        } else if (onRemove) {
            onRemove(tag.id);
        }
    };

    const renderStatus = () => (
        <Tag
            style={{
                backgroundColor: colorToRGBA(tag.color, 20),
                color: adjustColor(tag.color, -150),
            }}
            interactive={(interactive || onChange != null) && !disabled}
            onRemove={onRemove && handleRemove}
            className="status-chip"
            minimal
            round
            id={tagId}
            icon={
                <>
                    {showParent && tag.parent != null && (<Tooltip content="Global tag" placement="top">
                        <Icon icon="globe-03" />
                    </Tooltip>)}
                    <FullCircle color={tag.color} size={8} />
                </>
            }
            fill={fill}
        >
            {tag.title}
        </Tag>
    );

    if (onChange != null) {
        return (
            <TagEditPopover tag={tag} onChange={onChange}>
                {renderStatus()}
            </TagEditPopover>
        );
    }

    return renderStatus();
};
