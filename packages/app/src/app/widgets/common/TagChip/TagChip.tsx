// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Tag, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { CSSProperties, FunctionComponent, useCallback, useState } from "react";
import tinycolor from "tinycolor2";

import { ITag } from "@stacks/types";
import { getTextColor } from "app/utils/colors";
import Dialog from "app/utils/dialog";
import { TagEditPopover } from "../TagEditPopover/TagEditPopover";
import { Icon } from "app/components/common";

interface TagChipProps {
    tag: ITag;
    small?: boolean;
    ellipsize?: boolean;
    interactive?: boolean;
    noMargins?: boolean;
    confirmRemove?: boolean;
    showParent?: boolean;
    onChange?: (tag: Partial<ITag>) => void;
    onRemove?: (tagId: string) => void;
}

export const TagChip: FunctionComponent<TagChipProps> = ({
    tag,
    small,
    ellipsize,
    interactive,
    noMargins,
    confirmRemove,
    showParent,
    onChange,
    onRemove,
}) => {
    const [overflows, setOverflows] = useState<boolean>(false);

    const handleOverflow = useCallback((elRef: null | HTMLSpanElement) => {
        if (ellipsize && elRef) {
            const span = elRef.children[0] as HTMLSpanElement;
            setOverflows(span.offsetWidth < span.scrollWidth);
        }
    }, []);

    const handleRemove = async (event: React.MouseEvent<HTMLButtonElement>, tagId: string) => {
        event.stopPropagation();

        if (confirmRemove) {
            const confirm: boolean = await Dialog.confirm(
                translate("Delete tag"),
                translate("Are you sure you want to delete this tag You will also lose any reference were it was assigned")
            );
            if (confirm && onRemove) {
                onRemove(tagId);
            }
        } else if (onRemove) {
            onRemove(tagId);
        }
    };

    const renderTag = () => {
        // const islight = textColor(color);
        const textColor = getTextColor(tag.color);

        const styles: CSSProperties = {
            backgroundColor: tag.color,
            borderColor: tinycolor(tag.color).darken(80).toHex(),
            // color: isLight(color) ? "#000" : "#fff",
            // color: islight ? "#000" : "#fff",
            color: textColor,
        };

        if (ellipsize) {
            styles.maxWidth = 100;
        }

        return (
            <Tag
                className={classNames("custom-tag", { small, noMargins })}
                style={styles}
                round
                interactive={interactive || onChange != null}
                onRemove={
                    onRemove ? (e: React.MouseEvent<HTMLButtonElement>) => handleRemove(e, tag.id) : undefined
                }
                ref={handleOverflow}
                icon={showParent && tag.parent != null && (<Tooltip content="Global tag" placement="top">
                    <Icon icon="globe-03" />
                </Tooltip>)}
            >
                {tag.title}
            </Tag>
        );
    };

    if (onChange != null) {
        return (
            <TagEditPopover tag={tag} onChange={onChange}>
                {renderTag()}
            </TagEditPopover>
        );
    }

    if (ellipsize && overflows) {
        return (
            <Tooltip content={tag.title} className="custom-tag-tooltip">
                {renderTag()}
            </Tooltip>
        );
    }

    return renderTag();
};
