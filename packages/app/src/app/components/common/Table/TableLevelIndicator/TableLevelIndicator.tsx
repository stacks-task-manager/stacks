// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from "classnames";
import React from "react";
import { FunctionComponent } from "react";


interface TableLevelIndicatorProps {
    level: number;
    isParent: boolean;
    isLast: boolean;
}
export const TableLevelIndicator: FunctionComponent<TableLevelIndicatorProps> = ({ level, isParent, isLast }) => {
    const isChildren = level > 0;
    return (
        <span className={classNames("table-level-indicator", {
            "is-last": isLast,
            "is-parent": isParent,
            "is-children": isChildren
        })}>
            {Array.from({ length: level + (isParent && isChildren ? 1 : 0) }).map((_, i) => (
                <span key={i} className="table-level-indicator-item" />
            ))}
        </span>
    )
}