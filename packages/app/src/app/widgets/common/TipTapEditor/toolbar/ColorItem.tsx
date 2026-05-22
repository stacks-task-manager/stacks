// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Intent, mergeRefs, Popover, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { HexColorPicker } from "react-colorful";

import { Icon } from "app/components/common";
import { getSelectionChain } from "./utils";
import { TipTapToolbarItem } from ".";

export const ColorItem: FunctionComponent<TipTapToolbarItem> = ({ editor, isColored, small }) => {
    const handleSetColor = (color: string) => {
        getSelectionChain(editor).setColor(color).run();
    };

    return (
        <Popover
            minimal
            placement="bottom"
            popoverClassName="popover-padded-medium"
            enforceFocus={false}
            content={<HexColorPicker onChange={handleSetColor} />}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ref, ...popoverProps }) => (
                <Tooltip
                    placement="top"
                    content="Text color"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen: isTooltipOpen, ref: tooltipRef, ...tooltipProps }) => (
                        <Button
                            {...popoverProps}
                            {...tooltipProps}
                            minimal
                            small={small}
                            active={isColored}
                            intent={isColored ? Intent.PRIMARY : Intent.NONE}
                            icon={<Icon icon="paint-pour" />}
                            ref={mergeRefs(ref, tooltipRef)}
                        />
                    )}
                />
            )}
        />
    );
};
