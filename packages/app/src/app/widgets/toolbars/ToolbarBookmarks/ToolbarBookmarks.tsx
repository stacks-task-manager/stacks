// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Menu, InputGroup, Intent, Popover, MenuItem } from "@blueprintjs/core";
import { Icon, ReloadButton, ToolbarButton } from "app/components/common";
import { useMousetrap } from "app/hooks";
import { toggleNewBookmark } from "app/store/global";
import { BookmarksActions } from "app/store/actions";

export const ToolbarBookmarks = () => {
    useMousetrap(["ctrl+n", "command+n"], toggleNewBookmark);

    const handleExport = (type: "excel" | "json" | "pdf") => {
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
                                    <MenuItem
                                        text={translate("Export")}
                                        icon={<Icon icon="download-04" />}
                                        data-testid="bookmarks-menu-export"
                                    >
                                        <MenuItem
                                            text={translate("Export as", { type: ".xlsx" })}
                                            icon={<Icon icon="download-04" />}
                                            onClick={() => handleExport("excel")}
                                            data-testid="bookmarks-menu-export-xlsx"
                                        />
                                        <MenuItem
                                            text={translate("Export as", { type: ".json" })}
                                            icon={<Icon icon="download-04" />}
                                            onClick={() => handleExport("json")}
                                            data-testid="bookmarks-menu-export-json"
                                        />
                                        <MenuItem
                                            text={translate("Export as", { type: ".pdf" })}
                                            icon={<Icon icon="download-04" />}
                                            onClick={() => handleExport("pdf")}
                                            data-testid="bookmarks-menu-export-pdf"
                                        />
                                    </MenuItem>
                                </Menu>
                            }
                            placement="bottom"
                        >
                            <Button
                                size="small"
                                variant="minimal"
                                icon={<Icon icon="chevron-down" />}
                                data-testid="bookmarks-menu-button"
                            />
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
