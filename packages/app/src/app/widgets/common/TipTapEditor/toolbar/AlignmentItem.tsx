// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import { Button, Intent, Popover } from "@blueprintjs/core";

import { Icon } from "app/components/common";
import { TagsWrapper, TipTapToolbarItem } from "app/widgets";
import { getSelectionChain } from "./utils";
import { SeparatorItem } from "./SeparatorItem";

export const AlignmentItem: FunctionComponent<TipTapToolbarItem> = ({ editor, textAlign, small }) => {
    const currentIcon = useMemo(() => {
        switch (textAlign) {
            case "center":
                return "align-center";
            case "left":
                return "align-left";
            case "right":
                return "align-right";
            case "justify":
                return "align-justify";
            default:
                return "align-left";
        }
    }, [textAlign]);

    if (small) {
        return (
            <Popover
                content={
                    <TagsWrapper gap={0}>
                        <Button
                            size="small"
                            variant="minimal"
                            intent={textAlign === "left" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => getSelectionChain(editor).setTextAlign("left").run()}
                            icon={<Icon icon="align-left" />}
                        />
                        <Button
                            size="small"
                            variant="minimal"
                            intent={textAlign === "center" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => getSelectionChain(editor).setTextAlign("center").run()}
                            icon={<Icon icon="align-center" />}
                        />
                        <Button
                            size="small"
                            variant="minimal"
                            intent={textAlign === "right" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => getSelectionChain(editor).setTextAlign("right").run()}
                            icon={<Icon icon="align-right" />}
                        />
                        <Button
                            size="small"
                            variant="minimal"
                            intent={textAlign === "justify" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => getSelectionChain(editor).setTextAlign("justify").run()}
                            icon={<Icon icon="align-justify" />}
                        />
                    </TagsWrapper>
                }
                placement="bottom-start"
                minimal
                enforceFocus={false}
            >
                <Button size="small" variant="minimal" icon={<Icon icon={currentIcon} />} />
            </Popover>
        );
    }

    return (
        <>
            <SeparatorItem />
            <Button
                variant="minimal"
                intent={textAlign === "left" ? Intent.PRIMARY : Intent.NONE}
                onClick={() => getSelectionChain(editor).setTextAlign("left").run()}
                icon={<Icon icon="align-left" />}
            />
            <Button
                variant="minimal"
                intent={textAlign === "center" ? Intent.PRIMARY : Intent.NONE}
                onClick={() => getSelectionChain(editor).setTextAlign("center").run()}
                icon={<Icon icon="align-center" />}
            />
            <Button
                variant="minimal"
                intent={textAlign === "right" ? Intent.PRIMARY : Intent.NONE}
                onClick={() => getSelectionChain(editor).setTextAlign("right").run()}
                icon={<Icon icon="align-right" />}
            />
            <Button
                variant="minimal"
                intent={textAlign === "justify" ? Intent.PRIMARY : Intent.NONE}
                onClick={() => getSelectionChain(editor).setTextAlign("justify").run()}
                icon={<Icon icon="align-justify" />}
            />
        </>
    );
};
