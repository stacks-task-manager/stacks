// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

interface ITableHeadProps {
    children: React.ReactNode;
    top?: number;
}
export const TableHead: FunctionComponent<ITableHeadProps> = ({ children, top }) => {
    return (
        <thead style={{ top }}>
            <tr>{children}</tr>
        </thead>
    );
};
