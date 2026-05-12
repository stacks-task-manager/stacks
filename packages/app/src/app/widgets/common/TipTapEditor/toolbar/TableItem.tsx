// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Intent, Menu, MenuDivider, MenuItem, Popover, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { Icon } from "app/components/common";
import { getSelectionChain } from "./utils";
import { TipTapToolbarItem } from ".";

export const TableItem: FunctionComponent<TipTapToolbarItem> = ({ editor, isTable, small }) => {
    if (!isTable) return null;

    return (
        <Popover
            placement="bottom"
            content={
                <Menu>
                    <MenuDivider title="Columns" />
                    <MenuItem
                        text="Add column before"
                        icon={<Icon icon="arrow-left" />}
                        onClick={() => getSelectionChain(editor).addColumnBefore().run()}
                    />
                    <MenuItem
                        text="Add column after"
                        icon={<Icon icon="arrow-right" />}
                        onClick={() => getSelectionChain(editor).addColumnAfter().run()}
                    />
                    <MenuItem
                        text="Delete column"
                        icon={<Icon icon="trash" />}
                        intent={Intent.WARNING}
                        onClick={() => getSelectionChain(editor).deleteColumn().run()}
                    />

                    <MenuDivider title="Rows" />
                    <MenuItem
                        text="Add row above"
                        icon={<Icon icon="arrow-up" />}
                        onClick={() => getSelectionChain(editor).addRowBefore().run()}
                    />
                    <MenuItem
                        text="Add row below"
                        icon={<Icon icon="arrow-down" />}
                        onClick={() => getSelectionChain(editor).addRowAfter().run()}
                    />
                    <MenuItem
                        text="Delete row"
                        icon={<Icon icon="trash" />}
                        intent={Intent.WARNING}
                        onClick={() => getSelectionChain(editor).deleteRow().run()}
                    />

                    <MenuDivider title="Cells" />
                    <MenuItem
                        text="Split cell"
                        icon={<Icon icon="maximize-01" />}
                        onClick={() => getSelectionChain(editor).splitCell().run()}
                    />
                    <MenuItem
                        text="Merge cells"
                        icon={<Icon icon="minimize-01" />}
                        onClick={() => getSelectionChain(editor).mergeCells().run()}
                    />

                    <MenuDivider title="Headers" />
                    <MenuItem
                        text="Toggle header column"
                        icon={<Icon icon="layout-left" />}
                        onClick={() => getSelectionChain(editor).toggleHeaderColumn().run()}
                    />
                    <MenuItem
                        text="Toggle header row"
                        icon={<Icon icon="layout-top" />}
                        onClick={() => getSelectionChain(editor).toggleHeaderRow().run()}
                    />
                    <MenuItem
                        text="Toggle header cell"
                        icon={<Icon icon="rows-03" />}
                        onClick={() => getSelectionChain(editor).toggleHeaderCell().run()}
                    />

                    <MenuDivider title="Table" />
                    <MenuItem
                        text="Delete table"
                        icon={<Icon icon="trash" />}
                        onClick={() => getSelectionChain(editor).deleteTable().run()}
                    />
                </Menu>
            }
        >
            <Tooltip content="Table options" placement="top">
                <Button variant="minimal" size={small ? "small" : undefined} icon={<Icon icon="table" />} intent={Intent.PRIMARY} />
            </Tooltip>
        </Popover>
    );
};
