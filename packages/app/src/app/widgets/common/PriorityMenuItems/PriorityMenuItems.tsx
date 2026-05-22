// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Intent, MenuDivider, MenuItem } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { Icon } from "app/components/common";
import { PRIORITY, PRIORITYICON } from "@stacks/types";

interface PriorityMenuItemsProps {
    value: PRIORITY;
    shouldDismiss?: boolean;
    selected?: number;
    showDivider?: boolean;
    onChange: (priority: PRIORITY | null, event: React.MouseEvent) => void;
}
export const PriorityMenuItems: FunctionComponent<PriorityMenuItemsProps> = ({
    value,
    shouldDismiss,
    selected,
    showDivider,
    onChange,
}) => {
    return (
        <>
            <MenuItem
                id={`priority-${PRIORITY.NONE}`}
                text={translate("None")}
                labelElement={
                    <Icon icon={!value || (value && value === PRIORITY.NONE) ? "check" : undefined} />
                }
                shouldDismissPopover={shouldDismiss}
                active={selected === 0}
                onClick={(event: React.MouseEvent) => onChange(null, event)}
            />
            {showDivider && <MenuDivider />}
            <MenuItem
                id={`priority-${PRIORITY.CRITICAL}`}
                text={translate("Critical")}
                icon={<Icon icon={PRIORITYICON.CRITICAL} />}
                intent={Intent.DANGER}
                labelElement={<Icon icon={value === PRIORITY.CRITICAL ? "check" : undefined} />}
                shouldDismissPopover={shouldDismiss}
                active={selected === 1}
                onClick={(event: React.MouseEvent) => onChange(PRIORITY.CRITICAL, event)}
            />
            <MenuItem
                id={`priority-${PRIORITY.HIGH}`}
                text={translate("High")}
                icon={<Icon icon={PRIORITYICON.HIGH} />}
                intent={Intent.DANGER}
                labelElement={<Icon icon={value === PRIORITY.HIGH ? "check" : undefined} />}
                shouldDismissPopover={shouldDismiss}
                active={selected === 2}
                onClick={(event: React.MouseEvent) => onChange(PRIORITY.HIGH, event)}
            />
            <MenuItem
                id={`priority-${PRIORITY.MEDIUM}`}
                text={translate("Medium")}
                icon={<Icon icon={PRIORITYICON.MEDIUM} />}
                intent={Intent.WARNING}
                labelElement={<Icon icon={value === PRIORITY.MEDIUM ? "check" : undefined} />}
                shouldDismissPopover={shouldDismiss}
                active={selected === 3}
                onClick={(event: React.MouseEvent) => onChange(PRIORITY.MEDIUM, event)}
            />

            <MenuItem
                id={`priority-${PRIORITY.LOW}`}
                text={translate("Low")}
                icon={<Icon icon={PRIORITYICON.LOW} />}
                intent={Intent.SUCCESS}
                labelElement={<Icon icon={value === PRIORITY.LOW ? "check" : undefined} />}
                shouldDismissPopover={shouldDismiss}
                active={selected === 4}
                onClick={(event: React.MouseEvent) => onChange(PRIORITY.LOW, event)}
            />
        </>
    );
};
