// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from "classnames";
import React, { FunctionComponent } from "react";

interface ITableFooterCellProps {
    children?: React.ReactNode;
    align?: "center" | "right";
    colSpan?: number;
    secondary?: boolean;
}
export const TableFooterCell: FunctionComponent<ITableFooterCellProps> = ({ children, align, colSpan, secondary }) => {
    return (
        <td colSpan={colSpan} className={classNames({ secondary })}>
            <div
                className={classNames("table-footer-cell", {
                    center: align === "center",
                    right: align === "right"
                })}
            >
                {children}
            </div>
        </td>
    );
};
