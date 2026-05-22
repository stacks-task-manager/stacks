// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { SIDEBAR_MENU_LABELS } from "app/locale/dynamic-messages";
import React from "react";
import { Classes, Switch } from "@blueprintjs/core";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import xor from "lodash/xor";
import classNames from "classnames";

import Log from "app/utils/log";
import { IPanelInterface } from ".";
import { Icon, SettingRow } from "app/components/common";
import { SIDEBARICON, SIDEBARITEMS } from "@stacks/types";

export class SidebarPanel extends React.Component<IPanelInterface> {
    render() {
        Log.info("[Component][SidebarPanel]", "render");
        const { preferences, onChange } = this.props;

        const unpinned = Object.keys(SIDEBARITEMS).filter(
            key => !preferences.pinnedItems.includes(key.toLowerCase() as SIDEBARITEMS)
        );

        return (
            <div className="preference-panel">
                <SettingRow
                    title="Hide `General` section"
                    description="If enabled, the sidebar will not show the `General` section any more."
                    rightElement={
                        <Switch
                            checked={preferences.hideGeneral}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("hideGeneral", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title="Pinned items"
                    description="Manage your prefered Sidebar pinned items. All non-pinned items will still be accessibile via the `More` context menu."
                    last
                >
                    <DragDropContext onDragEnd={this.handleReorderPinned}>
                        <Droppable droppableId="rows">
                            {provided => (
                                <div
                                    className={Classes.MENU}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    <div className={Classes.MENU_HEADER}>
                                        <h6 className={Classes.HEADING}>Pinned items</h6>
                                    </div>

                                    {preferences.pinnedItems.map((item: SIDEBARITEMS, index: number) => {
                                        return (
                                            <Draggable key={item} draggableId={item} index={index}>
                                                {provided => (
                                                    <div
                                                        className={Classes.MENU_ITEM}
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                    >
                                                        <span className={Classes.MENU_ITEM_ICON}>
                                                            <Icon icon={SIDEBARICON[item]} />
                                                        </span>
                                                        <div
                                                            className={classNames(
                                                                Classes.FILL,
                                                                Classes.TEXT_OVERFLOW_ELLIPSIS
                                                            )}
                                                        >
                                                            {SIDEBAR_MENU_LABELS[item] ?? item}
                                                        </div>
                                                        <div
                                                            className={Classes.MENU_ITEM_LABEL}
                                                            onClick={() => this.handleTogglePinnedItem(item)}
                                                        >
                                                            <Icon icon="pin-filled" />
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}

                                    {provided.placeholder}

                                    {unpinned && unpinned.length > 0 && (
                                        <div className={Classes.MENU_HEADER}>
                                            <h6 className={Classes.HEADING}>Un-Pinned items</h6>
                                            {unpinned.map(item => {
                                                return (
                                                    <div className={Classes.MENU_ITEM} key={item}>
                                                        <span className={Classes.MENU_ITEM_ICON}>
                                                            <Icon
                                                                icon={
                                                                    SIDEBARICON[
                                                                    item.toLowerCase() as SIDEBARITEMS
                                                                    ]
                                                                }
                                                            />
                                                        </span>
                                                        <div
                                                            className={classNames(
                                                                Classes.FILL,
                                                                Classes.TEXT_OVERFLOW_ELLIPSIS
                                                            )}
                                                        >
                                                            {SIDEBAR_MENU_LABELS[item.toLowerCase()] ??
                                                                item}
                                                        </div>
                                                        <div
                                                            className={Classes.MENU_ITEM_LABEL}
                                                            onClick={() =>
                                                                this.handleTogglePinnedItem(
                                                                    item.toLowerCase() as SIDEBARITEMS
                                                                )
                                                            }
                                                        >
                                                            <Icon icon="pin" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </SettingRow>
            </div>
        );
    }

    private handleReorderPinned = (result: DropResult) => {
        if (!result.destination || !result.source) return;
        if (result.destination.index === result.source.index) return;

        const { preferences } = this.props;

        const movedItem = preferences.pinnedItems[result.source.index];
        const pinnedItems = [...preferences.pinnedItems];
        pinnedItems.splice(result.source.index, 1);
        pinnedItems.splice(result.destination.index, 0, movedItem);
        this.props.onChange("pinnedItems", pinnedItems);
    };

    private handleTogglePinnedItem = (item: SIDEBARITEMS) => {
        this.props.onChange("pinnedItems", xor(this.props.preferences.pinnedItems, [item]));
    };
}
