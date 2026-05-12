// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { AnchorButton } from "@blueprintjs/core";
import React from "react";
import { HotkeyTooltip, Icon } from "app/components/common";
import { useElementHotkey } from "app/hooks";

export const TaskDetailsAddSubtaskButton = ({ disabled }: { disabled?: boolean }) => {
    const handleAddSubtask = useElementHotkey("shift+s", "new-subtask-button", true);

    return (
        <HotkeyTooltip
            title={translate("Add subtask")}
            placement="bottom"
            keys={["shift", "S"]}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...props }) => (
                <AnchorButton
                    {...props}
                    size="small"
                    variant="minimal"
                    icon={<Icon icon="git-branch-01" />}
                    disabled={disabled}
                    onClick={handleAddSubtask}
                    data-testid="task-details-header-new-subtask-button"
                />
            )}
        />
    );
};
