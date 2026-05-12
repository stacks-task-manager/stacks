// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

interface IFooterProps {
    children?: React.ReactNode;
}
export const Footer: FunctionComponent<IFooterProps> = props => {
    return <div className="footer">{props.children}</div>;
};
