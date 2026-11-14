// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, InputGroup } from "@blueprintjs/core";
import { translate } from "@stacks/translations";

import { Icon } from "app/components/common";
import {
    MainToolbar,
    SectionToolbar,
    SectionToolbarDivider,
    SectionToolbarSide,
    SectionToolbarTitle,
} from "app/widgets/toolbars/ToolbarLayout";

interface ToolbarWorkbooksProps {
    query: string;
    onQueryChange: (query: string) => void;
    onCreate: () => void;
}

export const ToolbarWorkbooks = ({ query, onQueryChange, onCreate }: ToolbarWorkbooksProps) => {
    return (
        <MainToolbar data-testid="workbooks-toolbar">
            <SectionToolbar>
                <SectionToolbarSide side>
                    <SectionToolbarTitle>
                        <h1>{translate("Workbooks")}</h1>
                    </SectionToolbarTitle>
                </SectionToolbarSide>
                <SectionToolbarSide fixed>
                    <InputGroup
                        round
                        leftIcon={<Icon icon="search" />}
                        value={query}
                        placeholder={translate("Search workbooks")}
                        onChange={event => onQueryChange(event.currentTarget.value)}
                        data-testid="workbooks-search-input"
                    />
                    <SectionToolbarDivider />
                    <Button
                        icon={<Icon icon="plus" />}
                        intent="primary"
                        onClick={onCreate}
                        data-testid="workbook-create-button"
                    >
                        {translate("Add workbook")}
                    </Button>
                </SectionToolbarSide>
            </SectionToolbar>
            <SectionToolbar>
                <SectionToolbarSide role="tablist" aria-label={translate("Workbooks")}>
                    <button type="button" role="tab" aria-selected className="view-type-button active">
                        <Icon icon="list-view" />
                        {translate("List")}
                    </button>
                </SectionToolbarSide>
                <SectionToolbarSide />
            </SectionToolbar>
        </MainToolbar>
    );
};
