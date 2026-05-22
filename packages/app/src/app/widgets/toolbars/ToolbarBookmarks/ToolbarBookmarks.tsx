// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useEffect } from "react";
import { Button, Menu, InputGroup, Intent, Popover, MenuItem } from "@blueprintjs/core";
import mousetrap from "mousetrap";
import { Icon, ReloadButton, ToolbarButton } from "app/components/common";
import { toggleNewBookmark } from "app/store/global";
import { BookmarksActions } from "app/store/actions";

export const ToolbarBookmarks = () => {
    useEffect(() => {
        mousetrap.bind(["ctrl+n", "command+n"], toggleNewBookmark);

        return () => {
            mousetrap.unbind(["ctrl+n", "command+n"]);
        };
    }, []);

    const handleExport = (type: "excel" | "json") => {
        BookmarksActions.exportBookmarks(type);
    };

    return (
        <div className="main-toolbar single">
            <div className="section-toolbar">
                <div className="section-toolbar-side side">
                    <div className="section-toolbar-title">
                        <h1>{translate("Bookmarks")}</h1>
                    </div>
                    <div className="section-toolbar-options">
                        <Popover
                            content={
                                <Menu>
                                    <MenuItem text={translate("Export")} icon={<Icon icon="download-04" />}>
                                        <MenuItem
                                            text={translate("Export as", { type: ".xlsx" })}
                                            icon={<Icon icon="download-04" />}
                                            onClick={() => handleExport("excel")}
                                        />
                                        <MenuItem
                                            text={translate("Export as", { type: ".json" })}
                                            icon={<Icon icon="download-04" />}
                                            onClick={() => handleExport("json")}
                                        />
                                    </MenuItem>
                                </Menu>
                            }
                            placement="bottom"
                        >
                            <Button size="small" variant="minimal" icon={<Icon icon="chevron-down" />} />
                        </Popover>
                    </div>
                </div>
                <div className="section-toolbar-side fixed">
                    <InputGroup
                        leftIcon={<Icon icon="search" />}
                        placeholder={translate("Search bookmark")}
                        round
                        type="search"
                        onChange={BookmarksActions.setQuery}
                    />

                    <span className="section-toolbar-divider" />

                    <ReloadButton
                        tooltip={translate("Reload bookmarks")}
                        placement="bottom-end"
                        onClick={BookmarksActions.load}
                    />

                    <ToolbarButton
                        icon="bookmark-add"
                        title={translate("Add bookmark")}
                        tooltip="Add a new bookmark"
                        keys={["meta", "N"]}
                        minimal={false}
                        intent={Intent.PRIMARY}
                        placement="bottom-end"
                        active
                        onClick={toggleNewBookmark}
                    />
                </div>
            </div>
        </div>
    );
};
