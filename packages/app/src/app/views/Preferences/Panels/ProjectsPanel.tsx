// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { Callout, Intent, Switch } from "@blueprintjs/core";
import Log from "app/utils/log";
import { IPanelInterface } from ".";
import { SettingRow } from "app/components/common";

export class ProjectsPanel extends React.Component<IPanelInterface> {
    render() {
        Log.info("[Component][ProjectsPanel]", "render");
        const { preferences, onChange } = this.props;

        return (
            <div className="preference-panel">
                <SettingRow
                    sectionTitle={translate("Board")}
                    title={translate("Hide new stack button")}
                    description={translate(
                        "When turned on it will hide the Add a new Stack placeholder button from the Board view"
                    )}
                    last
                    rightElement={
                        <Switch
                            checked={preferences.hideNewStack}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("hideNewStack", event.currentTarget.checked)
                            }
                        />
                    }
                />
                <SettingRow
                    sectionTitle={translate("Stacks")}
                    title={translate("Show stack progress")}
                    description={translate(
                        "When turned on an overall percentage will be shown for each Stack based on their tasks completness and progress"
                    )}
                    rightElement={
                        <Switch
                            checked={preferences.showStackProgress}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showStackProgress", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title={translate("Highlight selected stack")}
                    description={translate(
                        "When using keyboard navigation to browse tasks the selected tasks stack will be visually indicated by a highlighted blue border"
                    )}
                    rightElement={
                        <Switch
                            checked={preferences.highlightStack}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("highlightStack", event.currentTarget.checked)
                            }
                        />
                    }
                >
                    {!preferences.highlightStack ? (
                        <Callout intent={Intent.PRIMARY}>
                            {translate(
                                "If you prefer to use the keyboard to add new tasks or to navigate through the stacks we recommend that you enable this option"
                            )}
                        </Callout>
                    ) : null}
                </SettingRow>
                <SettingRow
                    title={translate("Show larger stacks")}
                    description="The stacks will be shown with a larger size."
                    rightElement={
                        <Switch
                            checked={preferences.showLargeStacks}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showLargeStacks", event.currentTarget.checked)
                            }
                        />
                    }
                />
                <SettingRow
                    title={translate("Enable columns background")}
                    description={translate(
                        "When enabled this option darkens the board column backgrounds for better visibility and contrast"
                    )}
                    rightElement={
                        <Switch
                            checked={preferences.stacksBackground}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("stacksBackground", event.currentTarget.checked)
                            }
                        />
                    }
                />
                <SettingRow
                    title={translate("Show larger Stack tint bar")}
                    description="The stack header will be bigger and more visible."
                    rightElement={
                        <Switch
                            checked={preferences.biggerStackHeader}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("biggerStackHeader", event.currentTarget.checked)
                            }
                        />
                    }
                />
                <SettingRow
                    title={translate("Lazy load stacks")}
                    description={translate(
                        "When working on a large number of stacks on a single project this is recommended This option prevents stacks and all its contents from loading while they are not visible improving speed and memory utilization"
                    )}
                    rightElement={
                        <Switch
                            checked={preferences.stackLazyLoad}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("stackLazyLoad", event.currentTarget.checked)
                            }
                        />
                    }
                    last
                >
                    {!preferences.stackLazyLoad ? (
                        <Callout intent={Intent.WARNING}>
                            {translate(
                                "We recommend turning this option ON if you notice any decrease in performance"
                            )}
                        </Callout>
                    ) : null}
                </SettingRow>
                <SettingRow
                    sectionTitle="Task card"
                    title={translate("Highlight selected task")}
                    description={translate(
                        "When navigating through tasks using the keyboard a highlighted blue border will appear around the task"
                    )}
                    rightElement={
                        <Switch
                            checked={preferences.highlightTask}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("highlightTask", event.currentTarget.checked)
                            }
                        />
                    }
                >
                    {!preferences.highlightTask ? (
                        <Callout intent={Intent.PRIMARY}>
                            {translate(
                                "If you prefer to use the keyboard to navigate through the tasks we recommend that you enable this option"
                            )}
                        </Callout>
                    ) : null}
                </SettingRow>
                {preferences.highlightTask ? (
                    <SettingRow
                        title={translate("Click to select tasks")}
                        description={translate("Clicking on a task will automatically select and highlight it")}
                        rightElement={
                            <Switch
                                checked={preferences.clickSelectTask}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                    onChange("clickSelectTask", event.currentTarget.checked)
                                }
                            />
                        }
                    />
                ) : null}

                <SettingRow
                    title={translate("Show progress")}
                    description={translate("Wheter to show or not the progress in the task card")}
                    rightElement={
                        <Switch
                            checked={preferences.showProgress}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showProgress", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title={translate("Show description")}
                    description={translate("Wheter to show or not the description in the task card")}
                    rightElement={
                        <Switch
                            checked={preferences.showDescription}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showDescription", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title={translate("Show priority")}
                    description={translate("Wheter to show or not the priority in the task card")}
                    rightElement={
                        <Switch
                            checked={preferences.showPriority}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showPriority", event.currentTarget.checked)
                            }
                        />
                    }
                />
                {preferences.showPriority ? (
                    <SettingRow
                        title={translate("Show verbose priority")}
                        description={translate(
                            "When enabled priority chips will be shown as a larger size"
                        )}
                        rightElement={
                            <Switch
                                checked={preferences.showExtendedPriority}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                    onChange("showExtendedPriority", event.currentTarget.checked)
                                }
                            />
                        }
                    />
                ) : null}

                <SettingRow
                    title={translate("Show verbose status")}
                    description={translate(
                        "When enabled the status chips will be shown as a larger size"
                    )}
                    rightElement={
                        <Switch
                            checked={preferences.showExtendedStatus}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showExtendedStatus", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title={translate("Show assignees")}
                    description={translate("Wheter to show or not the assignees in the task card")}
                    rightElement={
                        <Switch
                            checked={preferences.showAssignees}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showAssignees", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title={translate("Show dates")}
                    description={translate("Wheter to show or not the dates in the task card")}
                    rightElement={
                        <Switch
                            checked={preferences.showDates}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showDates", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title={translate("Show subtasks")}
                    description={translate("Wheter to show or not the subtasks in the task card")}
                    rightElement={
                        <Switch
                            checked={preferences.showSubtasks}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showSubtasks", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title={translate("Show comments counter")}
                    description={translate("Wheter to show or not the comments counter in the task card")}
                    rightElement={
                        <Switch
                            checked={preferences.showComments}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showComments", event.currentTarget.checked)
                            }
                        />
                    }
                    last
                />

                <SettingRow
                    title={translate("Show notifications")}
                    description={translate("Wheter to show or not the notifications in the task card")}
                    rightElement={
                        <Switch
                            checked={preferences.showNotifications}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showNotifications", event.currentTarget.checked)
                            }
                        />
                    }
                    last
                />
            </div>
        );
    }
}
