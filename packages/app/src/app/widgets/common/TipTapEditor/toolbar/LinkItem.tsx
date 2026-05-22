// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    ButtonVariant,
    Intent,
    Menu,
    MenuItem,
    mergeRefs,
    Popover,
    Size,
    Tooltip,
} from "@blueprintjs/core";
import React from "react";

import { Icon } from "app/components/common";
import { TipTapToolbarItem } from ".";
import { getSelectionChain } from "./utils";
import { FromUrlMenuItem } from "app/widgets";
import { IElectronDialog } from "@stacks/types";
import Dialog from "app/utils/dialog";

export const LinkItem = ({ editor, small, isLink }: TipTapToolbarItem) => {
    const handleAddLinkFromURL = (url: string) => {
        getSelectionChain(editor).extendMarkRange("link").setLink({ href: url }).run();
    };

    const handleAddLinkFromLocal = async () => {
        const info: IElectronDialog = await Dialog.showOpenDialog({
            title: "Select a file to link",
            buttonLabel: "Open",
            properties: ["openFile"],
        });
        if (!info.canceled && info.filePaths.length) {
            getSelectionChain(editor)
                .extendMarkRange("link")
                .setLink({ href: encodeURI(`file://${info.filePaths[0].replaceAll("\\", "/")}`) })
                .run();
        }
    };

    return (
        <Popover
            content={
                <Menu>
                    <FromUrlMenuItem onUrlAdd={handleAddLinkFromURL} />
                    <MenuItem
                        text="From local file..."
                        icon={<Icon icon="file-plus-02" />}
                        onClick={handleAddLinkFromLocal}
                    />
                </Menu>
            }
            placement="bottom-start"
            minimal
            renderTarget={({ isOpen: popoverOpen, ref: popoverRef, ...popoverProps }) => (
                <Tooltip
                    content="Link"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref: tooltipRef, ...tooltipProps }) => (
                        <Button
                            active={popoverOpen}
                            {...popoverProps}
                            {...tooltipProps}
                            ref={mergeRefs(popoverRef, tooltipRef)}
                            size={small ? Size.SMALL : undefined}
                            variant={ButtonVariant.MINIMAL}
                            icon={<Icon icon="link-01" />}
                            intent={isLink ? Intent.PRIMARY : Intent.NONE}
                        />
                    )}
                />
            )}
        />
    );
};
