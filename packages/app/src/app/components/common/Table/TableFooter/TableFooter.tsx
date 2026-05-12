// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

interface ITableFooterProps {
    children: React.ReactNode;
    detached?: boolean;
}
export const TableFooter: FunctionComponent<ITableFooterProps> = ({ children, detached }) => {
    return (
        <tfoot className={detached ? "detached" : undefined}>
            <tr>{children}</tr>
        </tfoot>
    );
};
