// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

interface ITableRowProps {
    children: React.ReactNode;
    className?: string;
    testId?: string;
}
export const TableRow: FunctionComponent<ITableRowProps> = ({ children, className, testId }) => {
    return (
        <tr className={className} data-testid={testId}>
            {children}
        </tr>
    );
};
