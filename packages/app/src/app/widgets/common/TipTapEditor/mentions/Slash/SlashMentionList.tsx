// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Menu, MenuItem } from "@blueprintjs/core";
import { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import React, { forwardRef, ForwardRefRenderFunction, useEffect, useImperativeHandle, useState } from "react";
import scrollIntoView from "scroll-into-view-if-needed";

import { BlankSlate, Scroller } from "app/components/common";
import { APPICONS } from "@stacks/types";

type MentionListProps = SuggestionProps;

interface MentionListActions {
    onKeyDown: (props: SuggestionKeyDownProps) => void;
}

const MentionListRef: ForwardRefRenderFunction<MentionListActions, MentionListProps> = (
    { command, items },
    ref
) => {
    const handleCommand = (index: number) => {
        if (!items.length) return;
        command(items[index ?? 0]);
    };

    const [hoverIndex, setHoverIndex] = useState(0);

    useEffect(() => {
        if (!items.length) return;

        const commandItem = document.getElementById(`command-${hoverIndex}`);
        if (commandItem) {
            scrollIntoView(commandItem, { behavior: "smooth", block: "center" });
        }
    }, [hoverIndex]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            const { key } = event;

            if (key === "ArrowUp") {
                setHoverIndex(prev => {
                    const beforeIndex = prev - 1;
                    return beforeIndex >= 0 ? beforeIndex : 0;
                });
                return true;
            }

            if (key === "ArrowDown") {
                setHoverIndex(prev => {
                    const afterIndex = prev + 1;
                    const peopleCount = items.length - 1 < 0 ? 0 : items.length - 1;
                    return afterIndex < peopleCount ? afterIndex : peopleCount;
                });
                return true;
            }

            if (key === "Enter") {
                handleCommand(hoverIndex);
                return true;
            }

            return false;
        },
    }));

    return (
        <div className={Classes.POPOVER}>
            <div className={Classes.POPOVER_CONTENT}>
                <Scroller maxHeight={300} thin>
                    {items.length ? (
                        <Menu>
                            {items.map((item, index) => {
                                return (
                                    <MenuItem
                                        id={`command-${index}`}
                                        icon={item.icon}
                                        key={index}
                                        active={index === hoverIndex}
                                        onClick={() => handleCommand(index)}
                                        text={item.title}
                                        multiline
                                    />
                                );
                            })}
                        </Menu>
                    ) : (
                        <BlankSlate
                            icon={APPICONS.SEARCH}
                            title="Commands"
                            description="No commands found with the entered query"
                            maxWidth={180}
                            small
                        />
                    )}
                </Scroller>
            </div>
        </div>
    );
};

export const MentionList = forwardRef(MentionListRef);
