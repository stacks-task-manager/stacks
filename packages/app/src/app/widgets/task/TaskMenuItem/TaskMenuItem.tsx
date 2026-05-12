// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, MenuItem } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Grid, Icon, LazyLoad } from "app/components/common";
import { APPICONS, ITask } from "@stacks/types";
import { stripMd } from "app/utils/string";
import { getDocument } from "app/hooks";

interface TaskMenuItemProps {
    task: ITask;
    active?: boolean;
    selected?: boolean;
    shouldDismissPopover?: boolean;
    shouldOpenTask?: boolean;
    children?: React.ReactNode;
    isLazyLoaded?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}
export const TaskMenuItem: FunctionComponent<TaskMenuItemProps> = ({
    task,
    active,
    selected,
    shouldDismissPopover,
    children,
    shouldOpenTask,
    isLazyLoaded,
    disabled,
    onClick,
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const project = useMemo(() => {
        return getDocument(task.project);
    }, [task.project]);

    const handleOpenTask = () => {
        if (onClick != null) {
            onClick();
        } else if (shouldOpenTask != null) {
            navigate(`/task/${task.id}`, {
                state: {
                    backgroundLocation: location,
                },
            });
        }
    };

    return (
        <LazyLoad initialVisible={!isLazyLoaded} stayRendered threshold={0.2} defaultHeight={50}>
            <MenuItem
                key={task.id}
                icon={<Icon icon={APPICONS.TASK} />}
                id={`task-menu-item-${task.id}`}
                text={
                    <Grid gap={0}>
                        <div className={Classes.TEXT_OVERFLOW_ELLIPSIS}>{stripMd(task.title)}</div>
                        {project != null ? (
                            <small className={Classes.TEXT_MUTED}>{project?.text}</small>
                        ) : null}
                    </Grid>
                }
                shouldDismissPopover={shouldDismissPopover || false}
                labelElement={active ? <Icon icon="check" /> : children}
                active={selected}
                disabled={disabled}
                onClick={handleOpenTask}
            />
        </LazyLoad>
    );
};
