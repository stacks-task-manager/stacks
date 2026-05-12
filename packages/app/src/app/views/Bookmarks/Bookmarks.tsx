// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { BOOKMARK_TYPE_LABELS } from "app/locale/dynamic-messages";
import { Button, Classes, Intent, Menu, MenuItem, Popover, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { useMemo } from "react";
import { APPICONS, IBookmarkGoup, RECORDTYPE } from "@stacks/types";
import { BlankSlate, Grid, Icon, Link } from "app/components/common";
import { BookmarksActions } from "app/store/actions";
import { BookmarksStore } from "app/store/bookmarks";
import { toggleNewBookmark } from "app/store/global";
import { AppView, AppViewContent, ToolbarBookmarks } from "app/widgets";

export const Bookmarks = () => {
    const { bookmarks, query } = BookmarksStore.use();

    const grouped: IBookmarkGoup = useMemo(() => {
        const group: IBookmarkGoup = {
            pinned: [],
        };

        bookmarks
            .filter(bookmark => {
                if (!query.trim().length) return true;
                if (bookmark.type === RECORDTYPE.URL) {
                    return (
                        bookmark.title.toLowerCase().includes(query.toLowerCase()) ||
                        bookmark.url?.toLowerCase().includes(query.toLowerCase())
                    );
                }

                return bookmark.title.toLowerCase().includes(query.toLowerCase());
            })
            .forEach(bookmark => {
                if (!group[bookmark.type]) {
                    group[bookmark.type] = [];
                }

                if (bookmark.pinned) {
                    group.pinned.push(bookmark);
                } else {
                    group[bookmark.type].push(bookmark);
                }
            });

        return group;
    }, [bookmarks, query]);

    return (
        <AppView toolbar={<ToolbarBookmarks />}>
            <AppViewContent padded>
                {bookmarks.length === 0 && (
                    <Grid gap={0} padding={30} className="vertical">
                        <BlankSlate
                            icon="bookmark"
                            title="No bookmarks"
                            description={<div>You dont&apos;t have any bookmarks yet.</div>}
                        >
                            <Button
                                text={translate("Add bookmark")}
                                intent="primary"
                                onClick={toggleNewBookmark}
                            />
                        </BlankSlate>
                    </Grid>
                )}
                {bookmarks.length > 0 && (
                    <div className="bookmarks">
                        {Object.keys(grouped).map(type => {
                            if (grouped[type].length === 0) return null;

                            return (
                                <div key={type}>
                                    <h5 className={Classes.HEADING}>
                                        {BOOKMARK_TYPE_LABELS[type] ?? type}
                                    </h5>
                                    <ul className={classNames(Classes.MENU, Classes.ELEVATION_1)}>
                                        {grouped[type].map(bookmark => {
                                            return (
                                                <li key={bookmark.id}>
                                                    <div
                                                        className={classNames(Classes.MENU_ITEM, "bookmark")}
                                                    >
                                                        <span className={Classes.MENU_ITEM_ICON}>
                                                            <Icon
                                                                icon={
                                                                    APPICONS[
                                                                    bookmark.type.toUpperCase() as unknown as keyof typeof APPICONS
                                                                    ]
                                                                }
                                                            />
                                                        </span>
                                                        <div className="bookmark-wrapper">
                                                            <Link
                                                                type={bookmark.type}
                                                                id={bookmark.resourceId}
                                                                url={
                                                                    bookmark.type === RECORDTYPE.URL
                                                                        ? bookmark.url
                                                                        : undefined
                                                                }
                                                            >
                                                                <div className="bookmark-title">
                                                                    {bookmark.title}
                                                                </div>
                                                                {bookmark.type === RECORDTYPE.URL && (
                                                                    <small className={Classes.TEXT_MUTED}>
                                                                        {bookmark.url}
                                                                    </small>
                                                                )}
                                                            </Link>
                                                        </div>
                                                        <Tooltip
                                                            content={
                                                                bookmark.pinned
                                                                    ? "Unpin bookmark"
                                                                    : "Pin bookmark"
                                                            }
                                                            placement="top-end"
                                                        >
                                                            <Button
                                                                small
                                                                minimal
                                                                icon={
                                                                    <Icon
                                                                        icon={
                                                                            bookmark.pinned
                                                                                ? "pin-filled"
                                                                                : "pin"
                                                                        }
                                                                    />
                                                                }
                                                                intent={
                                                                    bookmark.pinned
                                                                        ? Intent.PRIMARY
                                                                        : Intent.NONE
                                                                }
                                                                onClick={() =>
                                                                    BookmarksActions.togglePinned(bookmark.id)
                                                                }
                                                            />
                                                        </Tooltip>
                                                        <Popover
                                                            content={
                                                                <Menu>
                                                                    <MenuItem
                                                                        text={
                                                                            bookmark.pinned ? "Unpin" : "Pin"
                                                                        }
                                                                        icon={<Icon icon="pin" />}
                                                                        onClick={() =>
                                                                            BookmarksActions.togglePinned(
                                                                                bookmark.id
                                                                            )
                                                                        }
                                                                    />
                                                                    <MenuItem
                                                                        text="Delete"
                                                                        icon={<Icon icon="trash" />}
                                                                        intent={Intent.DANGER}
                                                                        onClick={() =>
                                                                            BookmarksActions.remove(
                                                                                bookmark.id
                                                                            )
                                                                        }
                                                                    />
                                                                </Menu>
                                                            }
                                                            placement="bottom-end"
                                                        >
                                                            <Button
                                                                small
                                                                minimal
                                                                icon={<Icon icon="dots-vertical" />}
                                                            />
                                                        </Popover>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}
            </AppViewContent>
        </AppView>
    );
};
