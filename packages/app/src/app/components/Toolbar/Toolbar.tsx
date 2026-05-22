// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import classNames from "classnames";

interface IToolbarProps {
    type?: "clear";
    main?: boolean;
    children: React.ReactNode;
}
export const Toolbar: FunctionComponent<IToolbarProps> = ({ type, main, children }) => {
    const toolbartype = type || "default";
    return (
        <div id="toolbar" className={classNames(toolbartype, { main })}>
            {children}
        </div>
    );
};
