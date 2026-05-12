// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Button, Classes, IconName, Popover, Tooltip } from "@blueprintjs/core";

import { ICONS } from "@stacks/types";
import { Scroller } from "../../../components/common";

interface IIconsPopoverProps {
    icon?: IconName;
    onChange: (icon?: IconName) => void;
    children: React.ReactNode;
}
export const IconsPopover: FunctionComponent<IIconsPopoverProps> = ({ icon, children, onChange }) => {
    const renderIcons = () => {
        return (
            <Scroller className="icons-popover" vertical thin maxHeight={300}>
                <Tooltip content="No icon">
                    <Button
                        icon="blank"
                        minimal
                        className={Classes.POPOVER_DISMISS}
                        onClick={() => onChange()}
                    />
                </Tooltip>
                {Object.keys(ICONS).map((i, index) => (
                    <Button
                        icon={ICONS[i as keyof typeof ICONS]}
                        minimal={icon !== ICONS[i as keyof typeof ICONS]}
                        key={index}
                        className={Classes.POPOVER_DISMISS}
                        onClick={() => onChange(ICONS[i as keyof typeof ICONS])}
                    />
                ))}
            </Scroller>
        );
    };

    return (
        <Popover placement="right" content={renderIcons()} popoverClassName="popover-padded-small">
            {children}
        </Popover>
    );
};
