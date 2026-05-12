// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Switch } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { SettingRow } from "app/components/common";
import { IPanelInterface } from ".";

export const ProjectsGeneralPanel: FunctionComponent<IPanelInterface> = ({ onChange, preferences }) => {
    const handleSwitchDialog = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange("embeddedTask", false);
        onChange("dialogTask", event.currentTarget.checked);
    };

    return (
        <div className="preference-panel">
            <SettingRow
                sectionTitle={translate("General")}
                title="Show task details as a dialog window"
                description="Task details may be opened as a dialog window in the center of the app."
                rightElement={<Switch checked={preferences.dialogTask} onChange={handleSwitchDialog} />}
            />

            <SettingRow
                title="Use side-by-side task details"
                description={
                    <>
                        Task details may be opened side-by-side with the current view in certain cases.{" "}
                        <a
                            rel="noreferrer"
                            href="https://docs.getstacksapp.com/projects/task-details.html#embedded-panel"
                            target="_blank"
                        >
                            {translate("Learn more")}.
                        </a>
                    </>
                }
                rightElement={
                    <Switch
                        checked={preferences.embeddedTask}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            onChange("embeddedTask", event.currentTarget.checked)
                        }
                        disabled={preferences.dialogTask}
                    />
                }
                last={!preferences.embeddedTask}
            />

            {preferences.embeddedTask ? (
                <SettingRow
                    title="Click outside of task detail to close"
                    description="When this option is turned on clicking outside of the task details area will close the panel."
                    rightElement={
                        <Switch
                            checked={preferences.clickOutsideClose}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("clickOutsideClose", event.currentTarget.checked)
                            }
                        />
                    }
                    last
                />
            ) : null}
        </div>
    );
};
