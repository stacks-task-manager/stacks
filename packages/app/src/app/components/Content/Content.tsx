// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

interface IContentProps {
    children?: React.ReactNode;
    [x: string]: any;
}
export const Content: FunctionComponent<IContentProps> = props => {
    return (
        <div className="content-component" {...props}>
            {props.children}
        </div>
    );
};
