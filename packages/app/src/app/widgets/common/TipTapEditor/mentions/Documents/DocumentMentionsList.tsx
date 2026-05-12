// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Menu, MenuItem } from "@blueprintjs/core";
import { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import React, { forwardRef, ForwardRefRenderFunction, useEffect, useImperativeHandle, useState } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import classNames from "classnames";

import { BlankSlate, Icon, Scroller } from "app/components/common";
import { stripMd, truncateEnd } from "app/utils/string";
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

        const { id, type, title } = items[index];
        command({ id, label: stripMd(title).replaceAll("  ", " "), type });
    };

    const [hoverIndex, setHoverIndex] = useState(0);

    useEffect(() => {
        if (!items.length) return;

        const documentMenuItem = document.getElementById(`document-${items[hoverIndex].id}`);
        if (documentMenuItem) {
            scrollIntoView(documentMenuItem, { behavior: "smooth", block: "center" });
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
                                let icon = APPICONS.CLOSE;
                                if (item.type === "task") {
                                    icon = APPICONS.TASK;
                                } else if (item.type === "notepad") {
                                    icon = APPICONS.NOTEPAD;
                                } else if (item.type === "project") {
                                    icon = APPICONS.PROJECT;
                                }

                                return (
                                    <li key={item.id}>
                                        <a
                                            className={classNames(Classes.MENU_ITEM, {
                                                [Classes.ACTIVE]: index === hoverIndex,
                                            })}
                                            id={`document-${item.id}`}
                                            onClick={() => handleCommand(index)}
                                        >
                                            <span className={Classes.MENU_ITEM_ICON}>
                                                <Icon icon={icon} />
                                            </span>
                                            <div className={Classes.FILL}>
                                                <div>{truncateEnd(stripMd(item.title), 100)}</div>
                                                {item.parentTitle ? (
                                                    <div
                                                        className={classNames(
                                                            Classes.TEXT_SMALL,
                                                            Classes.TEXT_MUTED
                                                        )}
                                                    >
                                                        {translate("in")}{" "}
                                                        <strong>{item.parentTitle}</strong>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </a>
                                    </li>
                                );

                                return (
                                    <MenuItem
                                        id={`document-${item.id}`}
                                        icon={<Icon icon={icon} />}
                                        key={item.id}
                                        active={index === hoverIndex}
                                        onClick={() => handleCommand(index)}
                                        text={truncateEnd(stripMd(item.title), 100)}
                                        multiline
                                    />
                                );
                            })}
                        </Menu>
                    ) : (
                        <BlankSlate
                            icon={APPICONS.SEARCH}
                            title="Documents"
                            description="No document found with the entered query"
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
