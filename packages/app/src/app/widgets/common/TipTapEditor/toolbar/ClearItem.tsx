// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Intent, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { Icon } from "app/components/common";
import { TipTapToolbarItem } from ".";
import { getSelectionChain } from "./utils";
import { SeparatorItem } from "./SeparatorItem";

export const ClearItem: FunctionComponent<TipTapToolbarItem> = ({ editor, isCallout, small }) => {
    if (!isCallout) return null;

    return (
        <>
            <SeparatorItem />
            <Tooltip content="Clear callout" placement="top">
                <Button
                    minimal
                    small={small}
                    icon={<Icon icon="eraser" />}
                    intent={Intent.PRIMARY}
                    onClick={() => getSelectionChain(editor).clearNodes().unsetAllMarks().run()}
                />
            </Tooltip>
        </>
    );
};
