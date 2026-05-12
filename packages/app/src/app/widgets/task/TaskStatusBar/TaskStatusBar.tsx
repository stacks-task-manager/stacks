// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from "classnames";
import React, { FunctionComponent } from "react";

import { mergeRefs, Popover, Tooltip } from "@blueprintjs/core";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { TagsPicker } from "app/components/project";
import { TasksActions } from "app/store/actions";
import { adjustColor } from "app/utils/colors";
import { getTag } from "app/hooks";

interface TaskStatusBarProps {
    value: string | null;
    taskId: string;
    variant?: "card" | "table";
    disabled?: boolean;
}
export const TaskStatusBar: FunctionComponent<TaskStatusBarProps> = ({
    value,
    taskId,
    variant,
    disabled,
}) => {
    const status: ITag | undefined = value ? getTag(value) : undefined;


    if (status == null) return null;

    const handleToggleStatus = (tag: ITag) => {
        TasksActions.setStatus(taskId, tag.id);
    };

    const handleDisableClick = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    return (
        <span className={classNames("task-status-bar-wrapper", variant)} onClick={handleDisableClick}>
            <Popover
                content={
                    <TagsPicker
                        value={[status.id]}
                        section={TAGSECTION.PROJECTS}
                        type={TAGTYPE.STATUS}
                        onToggle={handleToggleStatus}
                    />
                }
                popoverClassName="popover-padded-small"
                disabled={disabled}
                renderTarget={({ isOpen, ref: popoverRef, ...popoverProps }) => (
                    <Tooltip
                        content={status.title}
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen: isTooltipOpen, ref: tooltipRef, ...tooltipProps }) => (
                            <div
                                {...popoverProps}
                                {...tooltipProps}
                                className={classNames("task-status-bar", { open: isOpen, disabled })}
                                style={{
                                    backgroundColor: status.color,
                                    borderColor: adjustColor(status.color, -20),
                                }}
                                ref={mergeRefs(popoverRef, tooltipRef)}
                            />
                        )}
                    />
                )}
            />
        </span>
    );
};
