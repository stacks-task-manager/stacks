// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from "classnames";
import React, { FunctionComponent } from "react";

interface IOverflowTextCellProps {
    children: React.ReactNode;
    faded?: boolean;
    onClick?: () => void;
}
export const OverflowTextCell: FunctionComponent<IOverflowTextCellProps> = ({ children, faded, onClick }) => {
    return (
        <div className={classNames("overflow-text-cell", { interactive: onClick != null, faded })} onClick={onClick}>
            {children}
        </div>
    );
};
