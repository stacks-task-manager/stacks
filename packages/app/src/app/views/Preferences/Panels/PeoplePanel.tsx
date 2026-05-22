// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Switch } from "@blueprintjs/core";
import React from "react";

import { SettingRow } from "app/components/common";
import Log from "app/utils/log";
import { IPanelInterface } from ".";

export class PeoplePanel extends React.Component<IPanelInterface> {
    render() {
        Log.info("[Component][PeoplePanel]", "render");
        const { preferences, onChange } = this.props;

        return (
            <div className="preference-panel">
                <SettingRow
                    sectionTitle="People"
                    title="Use side-by-side person details"
                    description="When enabled, the person details will be opened side-by-side with the current view in certain cases."
                    rightElement={
                        <Switch
                            checked={preferences.peopleEmbeddedPerson}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("peopleEmbeddedPerson", event.currentTarget.checked)
                            }
                        />
                    }
                />
                <SettingRow
                    title="Use side-by-side company details"
                    description="When enabled, the company details will be opened side-by-side with the current view in certain cases."
                    rightElement={
                        <Switch
                            checked={preferences.peopleEmbeddedCompany}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("peopleEmbeddedCompany", event.currentTarget.checked)
                            }
                        />
                    }
                    last
                />
            </div>
        );
    }
}
