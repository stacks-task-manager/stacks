// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Callout, FormGroup, InputGroup, Intent, Switch, TextArea } from "@blueprintjs/core";
import React, { useRef, useState } from "react";
import { SettingRow } from "app/components/common";
import { useAutocompleteBase } from "app/hooks/autocomplete";
import { FunctionComponent, useEffect } from "react";
import { IPanelInterface } from ".";

export const TasksPanel: FunctionComponent<IPanelInterface> = ({ onChange, preferences }) => {
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const debounce = useRef<NodeJS.Timeout | null>(null);
    const { show, hide, onSelect } = useAutocompleteBase();

    useEffect(() => {
        if (focused && inputRef.current) {
            show(inputRef.current, [
                {
                    values: [
                        {
                            key: translate("Title"),
                            value: "title}}",
                        },
                        {
                            key: translate("Description"),
                            value: "description}}",
                        },
                        {
                            key: translate("Complete state"),
                            value: "completeState}}",
                        },
                        {
                            key: translate("Assignees"),
                            value: "assignees}}",
                        },
                        {
                            key: translate("Tags"),
                            value: "tags}}",
                        },
                        {
                            key: translate("Status"),
                            value: "status}}",
                        },
                        {
                            key: translate("Due date"),
                            value: "dueDate}}",
                        },
                        {
                            key: translate("Start date"),
                            value: "startDate}}",
                        },
                        {
                            key: translate("Subtasks"),
                            value: "subtasks}}",
                        },
                        {
                            key: translate("Progress"),
                            value: "progress}}",
                        },
                        {
                            key: translate("Priority"),
                            value: "priority}}",
                        },
                        {
                            key: translate("Estimated time"),
                            value: "estimated}}",
                        },
                        {
                            key: translate("Spent time"),
                            value: "spent}}",
                        },
                        {
                            key: translate("New line"),
                            value: "nl}}",
                        },
                    ],
                    trigger: "{{",
                    menuShowMinLength: 0,
                    requireLeadingSpace: false,
                },
            ]);
        }
    }, [focused]);

    const handleSave = () => {
        if (inputRef.current) {
            onChange("taskCopyFormat", inputRef.current.value);
        }
    };

    onSelect(handleSave);

    const handleBlur = () => {
        if (inputRef.current) {
            hide(inputRef.current);
        }
        setFocused(false);
        handleSave();
    };

    const handleChange = () => {
        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }

        debounce.current = setTimeout(handleSave, 500);
    };

    return (
        <div className="preference-panel">
            <SettingRow
                title={translate("Fixed cover height")}
                description={translate("When enabled will show the best cover aspect ratio")}
                rightElement={
                    <Switch
                        checked={preferences.fixedCoverHeight}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            onChange("fixedCoverHeight", event.currentTarget.checked)
                        }
                    />
                }
            />

            <SettingRow
                title={translate("Lazy load tasks")}
                description={translate("Prevents tasks from loading while they are not visible explanation")}
                rightElement={
                    <Switch
                        checked={preferences.taskLazyLoad}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            onChange("taskLazyLoad", event.currentTarget.checked)
                        }
                    />
                }
            >
                {!preferences.taskLazyLoad ? (
                    <Callout intent={Intent.WARNING}>
                        We recommend turning this option <strong>ON</strong> if you notice any decrease in
                        performance.
                    </Callout>
                ) : null}
            </SettingRow>

            <SettingRow
                title={translate("Copy format")}
                description={
                    <div>
                        Define the format of the text copied of the selected task. Select what information you
                        want to include in the copied text.
                        <br /> Start typing `{"{{"}` to automatically insert the available variables.
                    </div>
                }
                rightElement={
                    <FormGroup label={translate("List separator")}>
                        <InputGroup
                            placeholder=", "
                            defaultValue={preferences.taskFormatSeparator}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("taskFormatSeparator", event.currentTarget.value)
                            }
                            style={{ width: 100 }}
                        />
                    </FormGroup>
                }
                last
            >
                <TextArea
                    placeholder="{{title}} - {{description}}"
                    fill
                    defaultValue={preferences.taskCopyFormat}
                    rows={3}
                    inputRef={inputRef}
                    onFocus={() => setFocused(true)}
                    onBlur={handleBlur}
                    onChange={handleChange}
                />
            </SettingRow>
        </div >
    );
};
