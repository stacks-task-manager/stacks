// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useEffect } from "react";

import { publish, useReminder } from "app/hooks";
import { ITask, REMINDER_RECORD_TYPE } from "@stacks/types";
import Reminders from "app/utils/reminders";
import { ReminderButton } from "app/widgets/common";
import { stripMd } from "app/utils/string";

interface TaskDetailsNotificationProps {
    task: ITask;
    disabled?: boolean;
}

export const TaskDetailsNotification: FunctionComponent<TaskDetailsNotificationProps> = ({
    task,
    disabled,
}) => {
    const { reminders, reload } = useReminder(task.id);

    useEffect(() => {
        publish("task:reminder:changed", { taskId: task.id, reminders });
    }, [reminders]);

    const handleSchedule = async (date: Date | undefined) => {
        if (date != null) {
            await Reminders.schedule({
                title: "Task reminder",
                subtitle: stripMd(task.title),
                date,
                recordId: task.id,
                recordType: REMINDER_RECORD_TYPE.TASK,
                url: `/project/${task.project}/${task.id}`,
            });
        } else {
            await Reminders.removeByRecord(task.id);
        }

        await reload();
    };

    const handleRemoveNotification = async (date: Date) => {
        const reminder = reminders.find(n => n.date === date);
        if (!reminder) return;
        Reminders.removeById(reminder.id);
        await reload();
    };

    const handleRemoveAllNotifications = async () => {
        Reminders.removeByRecord(task.id);
        await reload();
    };

    return (
        <ReminderButton
            placement="bottom"
            tooltipPlacement="bottom"
            reminders={reminders.map(r => r.date)}
            disabled={disabled}
            onAdd={handleSchedule}
            onRemove={handleRemoveNotification}
            onRemoveAll={handleRemoveAllNotifications}
        />
    );
};
