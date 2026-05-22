// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AnchorButton, Classes, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent } from "react";

import { HotkeyTooltip, Icon } from "app/components/common";
import { useElementHotkey, useNav, useStack, useStackTasks } from "app/hooks";
import { getTaskModalListBackgroundFromHistory } from "app/hooks/router";
import { TasksActions } from "app/store/actions";
import { setSelection } from "app/store/navigation";
import { PreferencesStore } from "app/store/preferences";
import { scrollIntoView } from "app/utils/dom";

interface TaskDetailsNavigationProps {
    taskId: string;
    stackId: string;
}
export const TaskDetailsNavigation: FunctionComponent<TaskDetailsNavigationProps> = ({ taskId, stackId }) => {
    const tasks = useStackTasks(stackId);
    const stack = useStack(stackId);

    const navigate = useNav();
    useElementHotkey("j", "td-next");
    useElementHotkey("k", "td-previous");

    const position = tasks.findIndex(task => task.id === taskId);

    const openTask = async (pos: number) => {
        if (pos > tasks.length || pos < 0) return;
        const nextTask = tasks[pos];
        const task = await TasksActions.getTask(nextTask.id);

        if (task == null) return;

        setSelection("", nextTask.id, false);

        if (PreferencesStore.get().embeddedTask) {
            navigate(`/project/${task.project}/${task.id}`);
            setTimeout(() => {
                scrollIntoView(document.getElementById(`task-${task.id}`), { behavior: "smooth" });
            }, 500);
        } else {
            const listBackground = getTaskModalListBackgroundFromHistory();
            const pathname =
                listBackground?.pathname?.startsWith("/timebox") === true
                    ? listBackground.pathname
                    : `/project/${task.project}`;
            navigate(`/task/${task.id}`, {
                state: {
                    backgroundLocation: {
                        pathname,
                        search: listBackground?.search ?? "",
                        hash: listBackground?.hash ?? "",
                        state: null,
                    },
                },
            });
        }
    };

    const handleNext = () => {
        openTask(position + 1);
    };

    const previousNext = () => {
        openTask(position - 1);
    };

    const disabled = position === (tasks.length ?? 1) - 1;

    return (
        <>
            <div>
                <HotkeyTooltip
                    title="Previous task"
                    placement="bottom"
                    keys={["K"]}
                    disabled={position === 0}
                >
                    <AnchorButton
                        id="td-previous"
                        minimal
                        small
                        icon={<Icon icon="chevron-up" />}
                        disabled={position === 0}
                        onClick={previousNext}
                    />
                </HotkeyTooltip>
                <HotkeyTooltip title="Next task" placement="bottom" keys={["J"]} disabled={disabled}>
                    <AnchorButton
                        id="td-next"
                        minimal
                        small
                        icon={<Icon icon="chevron-down" />}
                        disabled={disabled}
                        onClick={handleNext}
                    />
                </HotkeyTooltip>
            </div>

            <Tooltip placement="top" content={`In stack ${stack?.title}`}>
                <span className={classNames(Classes.TEXT_MUTED, Classes.TEXT_SMALL)}>
                    {position + 1} / {tasks.length ?? 1}
                </span>
            </Tooltip>
        </>
    );
};
