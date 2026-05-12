// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors, Popover, Tag } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent } from "react";
import tinycolor, { ColorInput } from "tinycolor2";

import { Grid } from "app/components/common";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { adjustColor } from "app/utils/colors";
import { TagChip } from "app/widgets";
import { useTags } from "app/hooks";

const allColors: ColorInput[] = [];
for (const i in tinycolor.names) {
    allColors.push(i);
}

interface ITagsProps {
    value: string[];
    tags?: ITag[];
    section: TAGSECTION;
    confirmRemove?: boolean;
    small?: boolean;
    max?: number;
    noMargins?: boolean;
    ellipsize?: boolean;
    showParent?: boolean;
    onChange?: (tag: Partial<ITag>) => void;
    onRemove?: (tagId: string) => void;
}

export const Tags: FunctionComponent<ITagsProps> = ({
    value,
    tags,
    section,
    confirmRemove,
    small,
    max,
    noMargins,
    ellipsize,
    showParent,
    onChange,
    onRemove,
}) => {
    const tagsFromHook = useTags(section, TAGTYPE.TAG, value);
    const tagsList = tags ?? tagsFromHook;

    const renderTag = (tag: ITag, nm?: boolean) => {
        return (
            <TagChip
                key={tag.id}
                tag={tag}
                noMargins={nm || noMargins}
                small={small}
                confirmRemove={confirmRemove}
                ellipsize={ellipsize}
                showParent={showParent}
                onRemove={onRemove}
                onChange={onChange}
            />
        );
    };

    const renderMore = (nm?: boolean) => {
        if (!max || tagsList.length - 1 < max) return null;

        const rest = tagsList.slice(max);

        return (
            <Tag
                className={classNames("custom-tag", { small, noMargins: nm || noMargins })}
                style={{
                    backgroundColor: Colors.DARK_GRAY1,
                    borderColor: adjustColor(Colors.DARK_GRAY1, -10),
                }}
                round
            >
                <Popover
                    content={
                        <Grid gap={5}>
                            {rest.map((tag: ITag, index: number) => (
                                <div key={index}>{renderTag(tag, false)}</div>
                            ))}
                        </Grid>
                    }
                    placement="auto"
                    popoverClassName="popover-padded-small"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <span {...props} className="tags-rest">{`+${rest.length.toString()}`}</span>
                    )}
                />
            </Tag>
        );
    };

    return (
        <React.Fragment>
            {tagsList.slice(0, max).map((tag: ITag) => renderTag(tag))}
            {renderMore()}
        </React.Fragment>
    );
};
