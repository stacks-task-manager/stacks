// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Intent, Size } from "@blueprintjs/core";
import { ColoredSelectCell, IColoredMenuItem } from "app/components/common/Table/Cells";
import { PROJECTHEALTH } from "@stacks/types";
import React, { FunctionComponent, useMemo } from "react";

const projectHealth: (IColoredMenuItem | undefined)[] = [
    {
        title: "Needs attention",
        value: "needsAttentions",
        intent: Intent.DANGER,
        icon: "x-circle",
    },
    {
        title: "At risk",
        value: "atRisk",
        intent: Intent.WARNING,
        icon: "alert-triangle",
    },
    {
        title: "Good",
        value: "good",
        intent: Intent.SUCCESS,
        icon: "check-circle",
    },
    undefined,
    {
        title: "Not set",
        value: undefined,
        intent: Intent.NONE,
        icon: "",
    },
];

interface IProjectHealthProps {
    value: PROJECTHEALTH | null;
    disabled?: boolean;
    onChange: (value?: PROJECTHEALTH) => void;
}
export const ProjectHealth: FunctionComponent<IProjectHealthProps> = ({ value, disabled, onChange }) => {
    const selectedItem = useMemo(() => {
        return projectHealth.find(item => item && item.value === value);
    }, [value]);

    return (
        <ColoredSelectCell
            items={projectHealth}
            value={value ?? undefined}
            intent={selectedItem?.intent || Intent.NONE}
            icon={selectedItem?.icon || ""}
            placement="bottom"
            size={Size.LARGE}
            disabled={disabled}
            onChange={(value?: string) => onChange(value as PROJECTHEALTH)}
        />
    );
};
