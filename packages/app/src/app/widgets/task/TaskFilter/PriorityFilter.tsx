// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alignment, Button, Colors, FormGroup, Intent, Popover } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { PRIORITY, PRIORITYICON } from "@stacks/types";
import { Icon } from "app/components/common/Icon/Icon";
import { TASK_PRIORITY } from "app/locale/dynamic-messages";
import { PriorityMenu } from "app/components/project/PriorityMenu/PriorityMenu";
import React, { FunctionComponent, memo, useMemo } from "react";

interface IPriorityFilterProps {
    priority?: PRIORITY;
    onChange: (priority: PRIORITY | null | undefined) => void;
}

export const PriorityFilter: FunctionComponent<IPriorityFilterProps> = memo(function PriorityFilter({
    priority,
    onChange,
}) {
    const icon = useMemo(() => {
        if (!priority || priority === PRIORITY.NONE) return "flag";
        switch (priority) {
            case PRIORITY.CRITICAL:
                return PRIORITYICON.CRITICAL;
            case PRIORITY.HIGH:
                return PRIORITYICON.HIGH;
            case PRIORITY.MEDIUM:
                return PRIORITYICON.MEDIUM;
            case PRIORITY.LOW:
                return PRIORITYICON.LOW;
        }
    }, [priority]);

    const color = useMemo(() => {
        if (!priority || priority === PRIORITY.NONE) return undefined;
        switch (priority) {
            case PRIORITY.CRITICAL:
            case PRIORITY.HIGH:
                return Colors.RED3;
            case PRIORITY.MEDIUM:
                return Colors.ORANGE3;
            case PRIORITY.LOW:
                return Colors.GREEN3;
        }
    }, [priority]);

    const label = useMemo(() => {
        if (!priority || priority === PRIORITY.NONE) return translate("Any priority");
        return TASK_PRIORITY[priority];
    }, [priority]);

    return (
        <FormGroup label={translate("Priority")}>
            <Popover
                content={
                    <PriorityMenu
                        value={priority || PRIORITY.NONE}
                        onChange={nextPriority =>
                            onChange(nextPriority === PRIORITY.NONE ? null : nextPriority)
                        }
                    />
                }
                placement="bottom"
                minimal
                matchTargetWidth
            >
                <Button
                    fill
                    icon={<Icon icon={icon} color={color} />}
                    endIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.START}
                    intent={priority != null ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>
        </FormGroup>
    );
});
