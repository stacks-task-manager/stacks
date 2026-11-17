// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Tag, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { CSSProperties, FunctionComponent, useCallback, useState } from "react";
import tinycolor from "tinycolor2";
import { FullCircle } from "@blueprintjs/icons";

import { ITag } from "@stacks/types";
import { Icon } from "app/components/common/Icon/Icon";
import { adjustColor, colorToRGBA, getTextColor } from "app/utils/colors";
import Dialog from "app/utils/dialog";
import { TagEditPopover } from "../TagEditPopover/TagEditPopover";

export interface TagChipProps {
    tag: ITag;
    variant?: "tag" | "status";
    small?: boolean;
    ellipsize?: boolean;
    interactive?: boolean;
    noMargins?: boolean;
    confirmRemove?: boolean;
    disabled?: boolean;
    fill?: boolean;
    showParent?: boolean;
    tagId?: string;
    testId?: string;
    onChange?: (tag: Partial<ITag>) => void;
    onRemove?: (tagId: string) => void;
}

export const TagChip: FunctionComponent<TagChipProps> = ({
    tag,
    variant = "tag",
    small,
    ellipsize,
    interactive,
    noMargins,
    confirmRemove,
    disabled,
    fill,
    showParent,
    tagId,
    testId,
    onChange,
    onRemove,
}) => {
    const [overflows, setOverflows] = useState(false);
    const isStatus = variant === "status";

    const handleOverflow = useCallback(
        (elRef: null | HTMLSpanElement) => {
            if (ellipsize && elRef) {
                const span = elRef.children[0] as HTMLSpanElement;
                setOverflows(span.offsetWidth < span.scrollWidth);
            }
        },
        [ellipsize]
    );

    const handleRemove = async (event: React.MouseEvent<HTMLButtonElement>, tagId: string) => {
        event.stopPropagation();

        if (confirmRemove) {
            const confirm = await Dialog.confirm(
                translate(isStatus ? "Delete status" : "Delete tag"),
                isStatus
                    ? translate(
                          "Are you sure you want to delete this status You will also lose any reference were it was assigned"
                      )
                    : translate(
                          "Are you sure you want to delete this tag You will also lose any reference were it was assigned"
                      )
            );
            if (confirm && onRemove) {
                onRemove(tagId);
            }
        } else if (onRemove) {
            onRemove(tagId);
        }
    };

    const renderChip = () => {
        const sharedProps = {
            interactive: (interactive || onChange != null) && !disabled,
            onRemove: onRemove
                ? (event: React.MouseEvent<HTMLButtonElement>) => handleRemove(event, tag.id)
                : undefined,
            round: true,
            id: tagId,
            "data-testid": testId,
            fill,
            icon:
                isStatus || (showParent && tag.parent != null) ? (
                    <>
                        {showParent && tag.parent != null && (
                            <Tooltip content="Global tag" placement="top">
                                <Icon icon="globe-03" />
                            </Tooltip>
                        )}
                        {isStatus && <FullCircle color={tag.color} size={8} />}
                    </>
                ) : undefined,
            children: tag.title,
        };

        if (isStatus) {
            return (
                <Tag
                    {...sharedProps}
                    style={{
                        backgroundColor: colorToRGBA(tag.color, 20),
                        color: adjustColor(tag.color, -150),
                    }}
                    className="status-chip"
                    data-testid={testId}
                    minimal
                />
            );
        }

        const styles: CSSProperties = {
            backgroundColor: tag.color,
            borderColor: tinycolor(tag.color).darken(80).toHex(),
            color: getTextColor(tag.color),
        };
        if (ellipsize) styles.maxWidth = 100;

        return (
            <Tag
                {...sharedProps}
                className={classNames("custom-tag", { small, noMargins })}
                style={styles}
                ref={handleOverflow}
            />
        );
    };

    const chip = renderChip();
    if (onChange != null) {
        return (
            <TagEditPopover tag={tag} onChange={onChange}>
                {chip}
            </TagEditPopover>
        );
    }

    if (!isStatus && ellipsize && overflows) {
        return (
            <Tooltip content={tag.title} className="custom-tag-tooltip">
                {chip}
            </Tooltip>
        );
    }

    return chip;
};
