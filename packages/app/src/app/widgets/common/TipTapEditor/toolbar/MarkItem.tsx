// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Colors, Intent, mergeRefs, Popover, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { Icon } from "app/components/common";
import { TagsWrapper, TipTapToolbarItem } from "app/widgets";
import { getSelectionChain } from "./utils";

export const MarkItem: FunctionComponent<TipTapToolbarItem> = ({ editor, isHighlighted, small }) => {
    return (
        <Popover
            enforceFocus={false}
            content={
                <TagsWrapper gap={0}>
                    <Button
                        minimal
                        small={small}
                        icon={<Icon icon="circle-filled" color={Colors.GOLD5} />}
                        onClick={() => getSelectionChain(editor).toggleHighlight().run()}
                    />

                    <Button
                        minimal
                        small={small}
                        icon={<Icon icon="circle-filled" color={Colors.GREEN3} />}
                        onClick={() =>
                            getSelectionChain(editor).toggleHighlight({ color: Colors.GREEN5 }).run()
                        }
                    />
                    <Button
                        minimal
                        small={small}
                        icon={<Icon icon="circle-filled" color={Colors.BLUE3} />}
                        onClick={() =>
                            getSelectionChain(editor).toggleHighlight({ color: Colors.BLUE5 }).run()
                        }
                    />
                    <Button
                        minimal
                        small={small}
                        icon={<Icon icon="circle-filled" color={Colors.VERMILION3} />}
                        onClick={() =>
                            getSelectionChain(editor).toggleHighlight({ color: Colors.VERMILION5 }).run()
                        }
                    />
                    <Button
                        minimal
                        small={small}
                        icon={<Icon icon="circle-filled" color={Colors.INDIGO3} />}
                        onClick={() =>
                            getSelectionChain(editor).toggleHighlight({ color: Colors.INDIGO5 }).run()
                        }
                    />
                    <Button
                        minimal
                        small={small}
                        icon={<Icon icon="circle-filled" color={Colors.ORANGE3} />}
                        onClick={() =>
                            getSelectionChain(editor).toggleHighlight({ color: Colors.ORANGE5 }).run()
                        }
                    />
                </TagsWrapper>
            }
            placement="bottom-start"
            minimal
            renderTarget={({ isOpen, ref: popoverRef, ...popoverProps }) => (
                <Tooltip
                    content="Mark"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen: tooltipOpen, ref: tooltipRef, ...tooltipProps }) => (
                        <Button
                            {...popoverProps}
                            {...tooltipProps}
                            active={isOpen}
                            ref={mergeRefs(popoverRef, tooltipRef)}
                            small={small}
                            minimal
                            intent={isHighlighted ? Intent.PRIMARY : Intent.NONE}
                            icon={<Icon icon="roller-brush" />}
                        />
                    )}
                />
            )}
        />
    );
};
