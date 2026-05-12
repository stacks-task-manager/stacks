// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Plus } from "@blueprintjs/icons";
import classNames from "classnames";
import React, { FunctionComponent } from "react";
import { PopupNewGeneric } from "app/components/common";
import { getCurrentProjectId, usePreferences } from "app/hooks";
import { StacksActions } from "app/store/actions";

interface INewStackProps {
    narrow?: boolean;
}

export const NewStack: FunctionComponent<INewStackProps> = ({ narrow }) => {
    const { hideNewStack } = usePreferences(["hideNewStack"]);
    if (hideNewStack) return null;

    const handleCreateStack = (title: string) => {
        const project = getCurrentProjectId();
        StacksActions.add({ title: title.trim(), project });
    };

    return (
        <PopupNewGeneric
            placeholder={translate("Untitled stack")}
            matchTargetWidth={!narrow}
            fill={narrow}
            onAdd={handleCreateStack}
        >
            <div id="stack-add-new" className={classNames({ narrow })} data-testid="stack-add-new">
                <Plus size={28} />
                <div>
                    {translate("Add a new stack")}
                </div>
            </div>
        </PopupNewGeneric>
    );
};
