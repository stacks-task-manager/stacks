// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Alignment,
    Button,
    Colors,
    FormGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { ITag, TAGSECTION } from "@stacks/types";
import { Icon } from "app/components/common/Icon/Icon";
import { StatusesMenu } from "app/components/project/StatusesMenu/StatusesMenu";
import { TagChip } from "app/widgets/common/TagChip/TagChip";
import { TagsWrapper } from "app/widgets/common/TagsWrapper/TagsWrapper";
import React, { FunctionComponent, memo, useCallback, useMemo } from "react";

interface IStatusesFilterProps {
    statuses: string[];
    availableStatuses: ITag[];
    multiple?: boolean;
    onChange: (statuses: string[]) => void;
}

export const StatusesFilter: FunctionComponent<IStatusesFilterProps> = memo(function StatusesFilter({
    statuses,
    availableStatuses,
    multiple = false,
    onChange,
}) {
    const selectedStatuses = useMemo(() => {
        const selected = new Set(statuses);
        return availableStatuses.filter(status => selected.has(status.id));
    }, [availableStatuses, statuses]);

    const label = useMemo(() => {
        if (statuses.length === 0) return translate("All statuses");
        if (statuses.length === 1) return selectedStatuses[0]?.title;
        return translate("Statuses selected", { count: statuses.length });
    }, [selectedStatuses, statuses.length]);

    const color = selectedStatuses.length === 1 ? selectedStatuses[0].color : Colors.GRAY3;

    const toggleStatus = useCallback(
        (statusId?: string) => {
            if (!statusId) {
                onChange([]);
                return;
            }
            const selected = new Set(statuses);
            if (selected.has(statusId)) {
                selected.delete(statusId);
            } else {
                selected.add(statusId);
            }
            onChange([...selected]);
        },
        [onChange, statuses]
    );

    return (
        <FormGroup label={translate("Status")}>
            <Popover
                content={
                    multiple ? (
                        <Menu>
                            <MenuItem
                                text={translate("All statuses")}
                                icon={<Icon icon="circle-filled" color={Colors.GRAY3} />}
                                labelElement={!statuses.length ? <Icon icon="check" /> : undefined}
                                onClick={() => onChange([])}
                                shouldDismissPopover={false}
                            />
                            <MenuDivider />
                            {availableStatuses.map(status => (
                                <MenuItem
                                    key={status.id}
                                    text={status.title}
                                    icon={<Icon icon="circle-filled" color={status.color} />}
                                    labelElement={
                                        statuses.includes(status.id) ? <Icon icon="check" /> : undefined
                                    }
                                    onClick={() => toggleStatus(status.id)}
                                    shouldDismissPopover={false}
                                />
                            ))}
                        </Menu>
                    ) : (
                        <StatusesMenu
                            value={selectedStatuses}
                            section={TAGSECTION.PROJECTS}
                            onChange={status => toggleStatus(status?.id)}
                        />
                    )
                }
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon="circle-filled" color={color} />}
                    endIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.START}
                    intent={statuses.length > 0 ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>

            {selectedStatuses.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    <TagsWrapper>
                        {selectedStatuses.map(status => (
                            <TagChip
                                variant="status"
                                key={status.id}
                                tag={status}
                                fill
                                onRemove={() => toggleStatus(status.id)}
                            />
                        ))}
                    </TagsWrapper>
                </div>
            )}
        </FormGroup>
    );
});
