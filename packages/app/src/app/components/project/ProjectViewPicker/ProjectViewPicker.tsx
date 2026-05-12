// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";
import { PROJECT_VIEWS_LABELS } from "app/locale/dynamic-messages";

import { PROJECTVIEW, PROJECT_VIEWS } from "@stacks/types";
import { Icon } from "app/components/common";

interface IProjectViewPickerProps {
    value?: PROJECTVIEW;
    disabled?: boolean;
    onChange: (view: PROJECTVIEW) => void;
}
export const ProjectViewPicker: FunctionComponent<IProjectViewPickerProps> = ({
    value,
    disabled,
    onChange,
}) => {
    const selectedValue = useMemo(() => {
        return (
            PROJECT_VIEWS.find(view => view.id === value) || {
                id: "default",
                icon: "",
            }
        );
    }, [value]);

    return (
        <Popover
            disabled={disabled}
            content={
                <Menu>
                    <MenuItem
                        text="Last used view - Default"
                        labelElement={
                            !selectedValue || selectedValue.id === PROJECTVIEW.DEFAULT ? (
                                <Icon icon="check" size={14} />
                            ) : undefined
                        }
                        onClick={() => onChange(PROJECTVIEW.DEFAULT)}
                    />
                    <MenuDivider />
                    {PROJECT_VIEWS.map(view => (
                        <MenuItem
                            key={view.id}
                            text={PROJECT_VIEWS_LABELS[view.id]}
                            icon={<Icon icon={view.icon} size={14} />}
                            labelElement={view.id === value ? <Icon icon="check" size={14} /> : undefined}
                            onClick={() => onChange(view.id)}
                        />
                    ))}
                </Menu>
            }
        >
            <Button
                icon={<Icon icon={selectedValue.icon} size={14} />}
                endIcon={<Icon icon="chevron-down" />}
            >
                {PROJECT_VIEWS_LABELS[selectedValue.id]}
            </Button>
        </Popover>
    );
};
