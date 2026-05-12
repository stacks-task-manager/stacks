// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Switch } from "@blueprintjs/core";
import React from "react";

import { SettingRow } from "app/components/common";
import Log from "app/utils/log";
import { IPanelInterface } from ".";

export class NotepadPanel extends React.Component<IPanelInterface> {
    render() {
        Log.info("[Component][GeneralPanel]", "render");
        const { preferences, onChange } = this.props;

        return (
            <div className="preference-panel">
                <SettingRow
                    sectionTitle="Notepad"
                    title="Make notepad width fixed"
                    description="When enabled, the notepad's editable area will have a fixed width. When turned off, it will completely fill the available space."
                    rightElement={
                        <Switch
                            checked={preferences.notepadFixWidth}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("notepadFixWidth", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title="Enable spell checking"
                    description="When enabled, the notepad's editable area will spell check your text."
                    last
                    rightElement={
                        <Switch
                            checked={preferences.notepadSpellCheck}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("notepadSpellCheck", event.currentTarget.checked)
                            }
                        />
                    }
                />

                {/* <SettingRow
                    title="Autosave interval"
                    description="Select the interval in minutes or seconds."
                    last
                    rightElement={
                        <HTMLSelect
                            disabled={!preferences.notepadAutoSave}
                            value={preferences.notepadAutoSaveInterval}
                            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                                onChange("notepadAutoSaveInterval", event.currentTarget.value)
                            }
                        >
                            <option value="500">{t("common.immediately")}</option>
                            <option value="5000">5 {t("common.seconds")}</option>
                            <option value="10000">10 {t("common.seconds")}</option>
                            <option value="20000">20 {t("common.seconds")}</option>
                            <option value="30000">30 {t("common.seconds")}</option>
                            <option value="60000">1 {t("common.minutes")}</option>
                            <option value="300000">5 {t("common.minutes")}</option>
                            <option value="600000">10 {t("common.minutes")}</option>
                        </HTMLSelect>
                    }
                /> */}
            </div>
        );
    }
}
