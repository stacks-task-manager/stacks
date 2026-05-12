// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { InputGroup, InputGroupProps } from "@blueprintjs/core";

export default class ToolbarSearch extends React.PureComponent<InputGroupProps> {
    render() {
        return (
            <div className="toolbar-item">
                <InputGroup leftIcon="search" round placeholder="Search task..." />
            </div>
        );
    }
}
