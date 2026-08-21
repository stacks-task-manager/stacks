// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { InputGroup, InputGroupProps } from "@blueprintjs/core";
import { translate } from "@stacks/translations";

export default class ToolbarSearch extends React.PureComponent<InputGroupProps> {
    render() {
        return (
            <div className="toolbar-item">
                <InputGroup
                    leftIcon="search"
                    round
                    {...this.props}
                    placeholder={translate("Search task")}
                    data-testid="toolbar-search"
                />
            </div>
        );
    }
}
