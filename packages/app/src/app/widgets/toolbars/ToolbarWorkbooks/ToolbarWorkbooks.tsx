// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, InputGroup } from "@blueprintjs/core";
import { translate } from "@stacks/translations";

import { Icon } from "app/components/common";

interface ToolbarWorkbooksProps {
    query: string;
    onQueryChange: (query: string) => void;
    onCreate: () => void;
}

export const ToolbarWorkbooks = ({ query, onQueryChange, onCreate }: ToolbarWorkbooksProps) => {
    return (
        <div className="main-toolbar" data-testid="workbooks-toolbar">
            <div className="section-toolbar">
                <div className="section-toolbar-side side">
                    <div className="section-toolbar-title">
                        <h1>{translate("Workbooks")}</h1>
                    </div>
                </div>
                <div className="section-toolbar-side fixed">
                    <InputGroup
                        round
                        leftIcon={<Icon icon="search" />}
                        value={query}
                        placeholder={translate("Search workbooks")}
                        onChange={event => onQueryChange(event.currentTarget.value)}
                        data-testid="workbooks-search-input"
                    />
                    <Button
                        icon={<Icon icon="plus" />}
                        intent="primary"
                        onClick={onCreate}
                        data-testid="workbook-create-button"
                    >
                        {translate("Add workbook")}
                    </Button>
                </div>
            </div>
            <div className="section-toolbar">
                <div className="section-toolbar-side" role="tablist" aria-label={translate("Workbooks")}>
                    <button type="button" role="tab" aria-selected className="view-type-button active">
                        <Icon icon="list-view" />
                        {translate("List")}
                    </button>
                </div>
                <div className="section-toolbar-side" />
            </div>
        </div>
    );
};
