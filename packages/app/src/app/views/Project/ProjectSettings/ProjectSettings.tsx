// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    Dialog,
    HTMLSelect,
    InputGroup,
    Intent,
    Switch,
    Tab,
    Tabs,
    Tag,
    TextArea,
    Tooltip,
} from "@blueprintjs/core";
import classNames from "classnames";
import { addYears } from "date-fns";
import React, { useMemo, useRef, useState } from "react";
import { PROJECTVIEW } from "@stacks/types";
import { DatePickerButton, Icon, RoundButton, SettingRow } from "app/components/common";
import { FeeInputPopup, PopupTime, ProjectViewPicker, TaskDetailsAssignees } from "app/components/project";
import { useCurrentProject, useMe } from "app/hooks";
import {
    useDefaultStackForProject,
    useProjectDefaultFilterState,
    useProjectDefaultView,
    useProjectShowingSettings,
    useProjectShowSubtasks,
} from "app/hooks/projectStatus";
import { ProjectFiltersActions, ProjectsActions, ProjectsStatusActions } from "app/store/actions";
import { DefaultProjectState } from "app/store/projectsStatus";
import { formatStringDuration } from "app/utils/date";
import toast from "app/utils/toast";
import { CompanyPicker, FieldsProjectSettings, StackSelect } from "app/widgets";
import { ICurrency } from "typings/common";

export const ProjectSettings = () => {
    const me = useMe();
    const [currentTab, setCurrentTab] = useState("settings");
    const { project } = useCurrentProject();
    const isShowingSettings = useProjectShowingSettings();
    const defaultStack = useDefaultStackForProject(project?.id);
    const defaultView = useProjectDefaultView();
    const defaultFilterState = useProjectDefaultFilterState();
    const showSubtasks = useProjectShowSubtasks();
    const descriptionDebounce = useRef<NodeJS.Timeout | null>(null);
    const [tempDescription, setTempDescription] = useState<string | undefined>(undefined);

    const isDisabled = useMemo(() => !me || me.id !== project?.projectOwner, [me, project?.projectOwner]);

    const currency: ICurrency | undefined = useMemo(() => {
        if (!project) return undefined;
        return window.currencies[project.currency || "USD"];
    }, [project]);

    const startDate = useMemo(() => {
        if (!project) return undefined;
        return project.startDate ?? undefined;
    }, [project]);

    const endDate = useMemo(() => {
        if (!project) return undefined;
        return project.endDate ?? undefined;
    }, [project]);

    if (!project) return null;

    const handleHourlyFeeChange = (hourlyRate: number | undefined, currency: string) => {
        ProjectsActions.setHourlyRate(hourlyRate, currency);
    };

    const handleViewChange = (view: PROJECTVIEW) => {
        ProjectsStatusActions.setDefaultView(view);
    };

    const handleChangeStartDate = (selectedDate: Date | null) => {
        ProjectsActions.setStartDate(selectedDate);
    };

    const handleChangeEndDate = (selectedDate: Date | null) => {
        ProjectsActions.setEndDate(selectedDate);
    };

    const handleSetStack = (stackId?: string) => {
        ProjectsStatusActions.setDefaultStack(stackId);
    };

    const handleSetFilter = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const defaultState = event.currentTarget.value as DefaultProjectState;
        await ProjectsStatusActions.setFilterState(defaultState);
        if (Boolean(defaultState)) {
            ProjectFiltersActions.set("state", defaultState);
        }

        toast.info(translate("To apply this option the app may need to be restarted"));
    };

    const handleSetShowSubtasks = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const showSubtasks = event.target.checked;
        await ProjectsStatusActions.setShowSubtasks(showSubtasks);
        ProjectFiltersActions.set("showSubtasks", showSubtasks);
    };

    const handleSetBackground = async (event: React.ChangeEvent<HTMLInputElement>) => {
        await ProjectsActions.setBackgroundUrl(event.currentTarget.value);
    };

    const handleDescriptionChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newDescription = event.currentTarget.value;
        setTempDescription(newDescription);

        if (descriptionDebounce.current) {
            clearTimeout(descriptionDebounce.current);
        }
        descriptionDebounce.current = setTimeout(async () => {
            await ProjectsActions.setDescription(project.id, newDescription);
        }, 500);
    };

    // const handleBrowseImage = async () => {
    //     const info: IElectronDialog = await AppDialog.showOpenDialog({
    //         title: "Select cover image",
    //         buttonLabel: "Open",
    //         filters: [
    //             {
    //                 name: "Image",
    //                 extensions: ["jpg", "jpeg", "png", "gif"],
    //             },
    //         ],
    //         properties: ["openFile"],
    //     });
    //     if (!info.canceled && info.filePaths.length) {
    //         const path = info.filePaths.at(0);
    //         if (path) {
    //             await ProjectActions.setBackgroundUrl(nodeUrl.pathToFileURL(path));
    //         }
    //     }
    // };

    const clearBackgroundImage = async () => {
        await ProjectsActions.setBackgroundUrl("");
    };

    return (
        <Dialog
            isOpen={isShowingSettings}
            onClose={ProjectsStatusActions.toggleSettingsVisibility}
            className="project-settings"
            style={{ width: 600 }}
            data-testid="project-settings-dialog"
        >
            <div data-testid="project-settings-dialog-content">
                <div className={classNames([Classes.DIALOG_HEADER, "has-tabs"])}>
                    <h6 className={Classes.HEADING}>{translate("Project settings")}</h6>

                    <Tabs
                        animate
                        fill
                        defaultSelectedTabId="settings"
                        selectedTabId={currentTab}
                        onChange={(currentTab: string) => setCurrentTab(currentTab)}
                        data-testid="project-settings-tabs"
                    >
                        <Tab
                            id="settings"
                            title={
                                <span data-testid="project-settings-tab-settings">
                                    {translate("Settings")}
                                </span>
                            }
                        />
                        <Tab
                            id="interface"
                            title={
                                <span data-testid="project-settings-tab-interface">
                                    {translate("Interface")}
                                </span>
                            }
                        />
                        <Tab
                            id="time"
                            title={<span data-testid="project-settings-tab-time">{translate("Time")}</span>}
                        />
                        <Tab
                            id="fields"
                            title={
                                <span data-testid="project-settings-tab-fields">{translate("Fields")}</span>
                            }
                        />
                    </Tabs>
                    <div style={{ width: 10 }} />
                    <Button
                        variant="minimal"
                        className={Classes.DIALOG_CLOSE_BUTTON}
                        icon="cross"
                        onClick={ProjectsStatusActions.toggleSettingsVisibility}
                        data-testid="project-settings-close-button"
                    />
                </div>

                <div className={Classes.DIALOG_BODY}>
                    {currentTab === "settings" ? (
                        <div>
                            <SettingRow
                                title={translate("Project description")}
                                description={translate(
                                    "A brief description of the project its purpose and its scope"
                                )}
                            >
                                <TextArea
                                    placeholder={translate("Project description")}
                                    fill
                                    value={tempDescription ?? project.description ?? ""}
                                    onChange={handleDescriptionChange}
                                    data-testid="project-settings-description-input"
                                />
                            </SettingRow>
                            <SettingRow
                                title={translate("Project owner")}
                                description={translate(
                                    "The project owner is typically but not always the head of the business unit receiving the product and bears business responsibility for successful project implementation"
                                )}
                                rightElement={
                                    <TaskDetailsAssignees
                                        assignees={project.projectOwner ? [project.projectOwner] : []}
                                        single
                                        large
                                        taskId="none"
                                        disabled={isDisabled}
                                        onChange={(assignees: string[]) =>
                                            ProjectsActions.setOwner(assignees.at(0))
                                        }
                                    />
                                }
                            />
                            <SettingRow
                                title={translate("Company")}
                                description={translate("The customer s company name")}
                                rightElement={
                                    <CompanyPicker
                                        defaultValue={project.company}
                                        maxWidth={150}
                                        disabled={isDisabled}
                                        onChange={ProjectsActions.setCompany}
                                    />
                                }
                            />
                            <SettingRow
                                title={translate("Default stack")}
                                description={translate(
                                    "Select the default stack where to add your tasks If none is selected the first stack will be used"
                                )}
                                rightElement={
                                    <StackSelect
                                        projectId={project.id}
                                        stackId={defaultStack}
                                        disabled={isDisabled}
                                        onChange={handleSetStack}
                                    />
                                }
                            />
                            <SettingRow
                                title={translate("Default filtering state")}
                                description={translate(
                                    "Select the default state of the filtered tasks If none is selected by default only incomplete tasks will be shown"
                                )}
                                rightElement={
                                    <HTMLSelect
                                        value={defaultFilterState}
                                        disabled={isDisabled}
                                        onChange={handleSetFilter}
                                        data-testid="project-settings-default-filter-select"
                                    >
                                        <option value="">{translate("Default")}</option>
                                        <option value="all">{translate("All tasks")}</option>
                                        <option value="done">{translate("Completed tasks")}</option>
                                        <option value="todo">{translate("Incomplete tasks")}</option>
                                    </HTMLSelect>
                                }
                            />

                            <SettingRow
                                title={translate("Show subtasks")}
                                description={translate(
                                    "Control the visibility of subtasks in the main project view When enabled subtasks will be displayed alongside regular tasks instead of being hidden within task details"
                                )}
                                last
                                rightElement={
                                    <Switch
                                        checked={showSubtasks}
                                        disabled={isDisabled}
                                        onChange={handleSetShowSubtasks}
                                        data-testid="project-settings-show-subtasks-switch"
                                    />
                                }
                            />
                        </div>
                    ) : null}

                    {currentTab === "time" ? (
                        <div>
                            <SettingRow
                                sectionTitle={translate("Settings")}
                                title={translate("Start date")}
                                description={translate(
                                    "This will indicate the date on which the project should begin"
                                )}
                                rightElement={
                                    <DatePickerButton
                                        value={startDate ?? null}
                                        maxDate={endDate ?? undefined}
                                        enableTimePicker={false}
                                        onChange={handleChangeStartDate}
                                        extendedFormat="PPP"
                                        disabled={isDisabled}
                                    />
                                }
                            />
                            <SettingRow
                                title={translate("End date")}
                                description={translate(
                                    "This will indicate the date on which the project should end"
                                )}
                                rightElement={
                                    <DatePickerButton
                                        value={endDate ?? null}
                                        maxDate={addYears(new Date(), 2)}
                                        minDate={startDate}
                                        enableTimePicker={false}
                                        onChange={handleChangeEndDate}
                                        extendedFormat="PPP"
                                        disabled={isDisabled}
                                        testId="project-settings-end-date-button"
                                    />
                                }
                            />
                            <SettingRow
                                title={translate("Timesheets approvers")}
                                description={translate(
                                    "Designated users who can review and approve timesheets in addition to the project owner"
                                )}
                                rightElement={
                                    <TaskDetailsAssignees
                                        assignees={project.approvers}
                                        single
                                        large
                                        taskId="none"
                                        disabled={isDisabled}
                                        onChange={(assignees: string[]) =>
                                            ProjectsActions.setApprovers(assignees)
                                        }
                                    />
                                }
                            />
                            <SettingRow
                                title={translate("Project estimate")}
                                description={translate("Estimated time to complete the project in hours")}
                                rightElement={
                                    <PopupTime
                                        value={project.estimate ?? 0}
                                        disabled={isDisabled}
                                        labelKey="Estimated time"
                                        onChange={ProjectsActions.setEstimate}
                                    >
                                        <>
                                            {!Boolean(project.estimate) && (
                                                <RoundButton
                                                    dashed
                                                    title={translate("Add estimate")}
                                                    icon="clock-plus"
                                                    disabled={isDisabled}
                                                />
                                            )}
                                            {Boolean(project.estimate) && (
                                                <Tag
                                                    minimal
                                                    interactive={!isDisabled}
                                                    onRemove={
                                                        project.estimate && !isDisabled
                                                            ? () => ProjectsActions.setEstimate(undefined)
                                                            : undefined
                                                    }
                                                    intent={Intent.SUCCESS}
                                                >
                                                    {project.estimate
                                                        ? formatStringDuration(project.estimate)
                                                        : translate("Not estimated")}
                                                </Tag>
                                            )}
                                        </>
                                    </PopupTime>
                                }
                            />
                            <SettingRow
                                title={translate("Hourly fee")}
                                description={translate(
                                    "Configure your hourly fee rate for this project This is used to calculate earning based on the estimated vs spent time"
                                )}
                                last
                                rightElement={
                                    <FeeInputPopup
                                        value={project.hourlyRate}
                                        currency={project.currency}
                                        disabled={isDisabled}
                                        label={translate("Hourly fee")}
                                        onChange={handleHourlyFeeChange}
                                    >
                                        <Tag
                                            minimal
                                            interactive={me.id === project.projectOwner}
                                            className="hourly-fee-tag"
                                        >
                                            <strong>
                                                {currency && currency.symbol} {project.hourlyRate}
                                            </strong>
                                        </Tag>
                                    </FeeInputPopup>
                                }
                            />
                        </div>
                    ) : null}

                    {currentTab === "interface" ? (
                        <div>
                            <SettingRow
                                sectionTitle={translate("Interface")}
                                title={translate("Default view")}
                                description={translate(
                                    "Customize the default view type for this project Whenever you click on this project the selected view will be shown"
                                )}
                                rightElement={
                                    <ProjectViewPicker
                                        disabled={isDisabled}
                                        value={defaultView}
                                        onChange={handleViewChange}
                                    />
                                }
                            />

                            <SettingRow
                                title={translate("Custom background image")}
                                description={translate(
                                    "Enter the image URL you want to use as a background in your project"
                                )}
                                last
                            >
                                <InputGroup
                                    value={project.backgroundUrl}
                                    onChange={handleSetBackground}
                                    disabled={isDisabled}
                                    data-testid="project-settings-background-url-input"
                                    rightElement={
                                        project.backgroundUrl != null && project.backgroundUrl.length > 0 ? (
                                            <Tooltip
                                                content={translate("Clear background image")}
                                                placement="top-end"
                                            >
                                                <Button
                                                    size="small"
                                                    variant="minimal"
                                                    onClick={clearBackgroundImage}
                                                    icon={<Icon icon="trash" />}
                                                    data-testid="project-settings-clear-background-button"
                                                />
                                            </Tooltip>
                                        ) : undefined
                                    }
                                />
                            </SettingRow>
                        </div>
                    ) : null}

                    {currentTab === "fields" ? <FieldsProjectSettings disabled={isDisabled} /> : null}
                </div>
            </div>
        </Dialog>
    );
};
