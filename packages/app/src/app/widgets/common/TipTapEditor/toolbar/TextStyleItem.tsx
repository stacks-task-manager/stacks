// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Intent, Menu, MenuItem, Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { getSelectionChain } from "./utils";
import { Icon } from "app/components/common";
import { TipTapToolbarItem } from ".";

export const TextStyleItem: FunctionComponent<TipTapToolbarItem> = ({
    editor,
    isBold,
    isItalic,
    isUnderline,
    isStrike,
    small,
}) => {
    const isActive = isBold || isItalic || isUnderline || isStrike;

    if (small) {
        return (
            <>
                <Popover
                    content={
                        <Menu>
                            <MenuItem
                                text="Bold"
                                icon={<Icon icon="bold-01" />}
                                labelElement={isBold ? <Icon icon="check" /> : null}
                                onClick={() => getSelectionChain(editor).toggleBold().run()}
                            />
                            <MenuItem
                                text="Underline"
                                onClick={() => getSelectionChain(editor).toggleUnderline().run()}
                                labelElement={isUnderline ? <Icon icon="check" /> : null}
                                icon={<Icon icon="underline-01" />}
                            />
                            <MenuItem
                                text="Italic"
                                onClick={() => getSelectionChain(editor).toggleItalic().run()}
                                labelElement={isItalic ? <Icon icon="check" /> : null}
                                icon={<Icon icon="italic-01" />}
                            />
                            <MenuItem
                                text="Strike"
                                onClick={() => getSelectionChain(editor).toggleStrike().run()}
                                labelElement={isStrike ? <Icon icon="check" /> : null}
                                icon={<Icon icon="strikethrough-01" />}
                            />
                        </Menu>
                    }
                    placement="bottom-start"
                    minimal
                >
                    <Button
                        small
                        minimal
                        icon={<Icon icon="type-01" />}
                        intent={isActive ? Intent.PRIMARY : Intent.NONE}
                    />
                </Popover>
            </>
        );
    }

    return (
        <>
            <Button
                minimal
                icon={<Icon icon="bold-01" />}
                intent={isBold ? Intent.PRIMARY : Intent.NONE}
                onClick={() => getSelectionChain(editor).toggleBold().run()}
            />
            <Button
                minimal
                onClick={() => getSelectionChain(editor).toggleUnderline().run()}
                intent={isItalic ? Intent.PRIMARY : Intent.NONE}
                icon={<Icon icon="underline-01" />}
            />
            <Button
                minimal
                onClick={() => getSelectionChain(editor).toggleItalic().run()}
                intent={isUnderline ? Intent.PRIMARY : Intent.NONE}
                icon={<Icon icon="italic-01" />}
            />
            <Button
                minimal
                onClick={() => getSelectionChain(editor).toggleStrike().run()}
                intent={isStrike ? Intent.PRIMARY : Intent.NONE}
                icon={<Icon icon="strikethrough-01" />}
            />
        </>
    );
};
