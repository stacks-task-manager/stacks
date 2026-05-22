// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { ComponentType } from "react";

/**
 * Build a TablePersistent `cell` component from a column id → renderer map plus default.
 */
export function createTableCellFromRegistry<Row, P extends { row: Row; column: string }>(
    registry: Partial<Record<string, ComponentType<P>>>,
    DefaultCell: ComponentType<P>
): ComponentType<P> {
    const Cell: ComponentType<P> = props => {
        const Renderer = registry[props.column];
        if (Renderer) {
            return <Renderer {...props} />;
        }
        return <DefaultCell {...props} />;
    };
    Cell.displayName = "RegistryTableCell";
    return Cell;
}
