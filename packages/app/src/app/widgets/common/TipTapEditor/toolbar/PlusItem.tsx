// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { Icon } from "app/components/common";
import { TipTapToolbarItem, URLPickerMenuItem } from "app/widgets";
import { getSelectionChain } from "./utils";

export const PlusItem: FunctionComponent<TipTapToolbarItem> = ({ editor, small }) => {
    const handleAddYouTubeLink = (src: string) => {
        editor.commands.setYoutubeVideo({
            src,
            width: 640,
            height: 480,
        });
    };

    const handleAddIframe = (src: string) => {
        editor.chain().focus().setWebview({ src }).run();
    };

    return (
        <Popover
            content={
                <Menu>
                    <MenuItem
                        text="Divider"
                        icon={<Icon icon="minus" />}
                        onClick={() => getSelectionChain(editor).setHorizontalRule().run()}
                    />
                    <MenuItem
                        text="Hard break"
                        icon={<Icon icon="align-bottom-01" />}
                        onClick={() => editor.chain().focus().setHardBreak().run()}
                    />
                    <MenuItem
                        text="Table"
                        icon={<Icon icon="table" />}
                        onClick={() =>
                            getSelectionChain(editor)
                                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                                .run()
                        }
                    />

                    <MenuDivider title="Callouts" />
                    <MenuItem
                        text="Primary callout"
                        icon={<Icon icon="plus-circle" />}
                        onClick={() => getSelectionChain(editor).setCallout({ intent: "primary" }).run()}
                    />
                    <MenuItem
                        text="Success callout"
                        icon={<Icon icon="check-circle" />}
                        onClick={() => getSelectionChain(editor).setCallout({ intent: "success" }).run()}
                    />
                    <MenuItem
                        text="Warning callout"
                        icon={<Icon icon="alert-triangle" />}
                        onClick={() => getSelectionChain(editor).setCallout({ intent: "warning" }).run()}
                    />
                    <MenuItem
                        text="Error callout"
                        icon={<Icon icon="alert-circle" />}
                        onClick={() => getSelectionChain(editor).setCallout({ intent: "danger" }).run()}
                    />

                    <MenuDivider title="Other" />
                    <MenuItem text="YouTube video" icon={<Icon icon="youtube" />}>
                        <URLPickerMenuItem onAdd={handleAddYouTubeLink} />
                    </MenuItem>
                    <MenuItem text="Embed Iframe" icon={<Icon icon="globe-06" />}>
                        <URLPickerMenuItem onAdd={handleAddIframe} />
                    </MenuItem>
                </Menu>
            }
            placement="bottom-start"
            minimal
        >
            <Button variant="minimal" size={small ? "small" : undefined} icon={<Icon icon="plus" />} />
        </Popover>
    );
};
