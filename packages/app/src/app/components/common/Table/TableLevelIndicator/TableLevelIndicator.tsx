// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from "classnames";
import { FunctionComponent } from "react";

interface TableLevelIndicatorProps {
    level: number;
    isParent: boolean;
    lastAtDepth: boolean[];
    testId?: string;
}
export const TableLevelIndicator: FunctionComponent<TableLevelIndicatorProps> = ({
    level,
    isParent,
    lastAtDepth,
    testId,
}) => {
    const isChildren = level > 0;
    const itemCount = level + (isParent && isChildren ? 1 : 0);

    return (
        <span
            className={classNames("table-level-indicator", {
                "is-parent": isParent,
                "is-children": isChildren,
            })}
            data-testid={testId}
            data-item-count={itemCount}
        >
            {Array.from({ length: itemCount }).map((_, i) => (
                <span
                    key={i}
                    data-testid={testId ? `${testId}-item-${i}` : undefined}
                    className={classNames("table-level-indicator-item", {
                        "is-current": i === level - 1,
                        "is-last": lastAtDepth[i + 1] ?? false,
                    })}
                />
            ))}
        </span>
    );
};
