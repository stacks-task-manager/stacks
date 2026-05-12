// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { AnchorButton } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { HotkeyTooltip, Icon } from "app/components/common";
import { QuickTimeLogPopover } from "app/components/project";
import { useElementHotkey } from "app/hooks";

interface TaskDetailsAddTimeProps {
    taskId: string;
    projectId: string;
    disabled?: boolean;
}
export const TaskDetailsAddTime: FunctionComponent<TaskDetailsAddTimeProps> = ({
    taskId,
    projectId,
    disabled,
}) => {
    useElementHotkey("shift+l", "td-log-time");

    return (
        <QuickTimeLogPopover taskId={taskId} projectId={projectId} placement="bottom-end" disabled={disabled}>
            <HotkeyTooltip
                title={translate("Log time")}
                placement="bottom"
                keys={["shift", "L"]}
                disabled={disabled}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ref, ...props }) => (
                    <AnchorButton
                        {...props}
                        ref={ref}
                        id="td-log-time"
                        size="small"
                        variant="minimal"
                        disabled={disabled}
                        icon={<Icon icon="clock-plus" />}
                    />
                )}
            />
        </QuickTimeLogPopover>
    );
};
