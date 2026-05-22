// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { HotkeyTooltip, Icon } from "app/components/common";
import { useElementHotkey } from "app/hooks";

interface TaskDetailsFullscreenButtonProps {
    isFullscreen?: boolean;
    onToggle?: () => void;
}
export const TaskDetailsFullscreenButton: FunctionComponent<TaskDetailsFullscreenButtonProps> = ({
    isFullscreen,
    onToggle,
}) => {
    useElementHotkey("shift+x", "td-fullscreen-button");

    return (
        <HotkeyTooltip
            title={translate("Toggle fullscreen")}
            placement="bottom-end"
            keys={["shift", "X"]}
        >
            <Button
                small
                minimal
                icon={<Icon icon={isFullscreen ? "shrink" : "expand-01"} />}
                id="td-fullscreen-button"
                onClick={onToggle}
            />
        </HotkeyTooltip>
    );
};
