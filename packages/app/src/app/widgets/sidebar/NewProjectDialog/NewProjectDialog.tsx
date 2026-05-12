// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Tag, TextArea } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback, useMemo, useState } from "react";
import { IProject, PROJECTVIEW, PROJECT_DEFAULT_VIEWS } from "@stacks/types";
import { DatePickerButton, Grid } from "app/components/common";
import { FeeInputPopup, TaskDetailsAssignees, TaskDetailsSection } from "app/components/project";
import { shallowEqual } from "app/hooks/store";
import { PeopleStore } from "app/store/people";
import { ICurrency } from "typings/common";

interface INewProjectDialogProps {
    onSave: (title: string, project: Partial<IProject>, isPublic: boolean) => void;
    onClose: () => void;
}
export const NewProjectDialog: FunctionComponent<INewProjectDialogProps> = ({ onSave, onClose }) => {
    const me = PeopleStore.use(state => state.me, shallowEqual);
    const [open, setOpen] = useState(true);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [projectOwner, setProjectOwner] = useState(me);
    const [starts, setStarts] = useState<null | Date>();
    const [ends, setEnds] = useState<null | Date>();
    const [hourlyRate, setHourlyRate] = useState<number | undefined>(0);
    const [currency, setCurrency] = useState<string>("USD");
    const [isPublic, setIsPublic] = useState(true);
    // const [isImport, setIsImport] = useState(false);
    // const [importPath, setImportPath] = useState<string>();
    // const [isImporting, setIsImporting] = useState(false);
    // const [importType, setImportType] = useState<"trello" | "asana">();

    const handleFocus = useCallback((titleRef: HTMLInputElement | null) => {
        if (titleRef) {
            titleRef.focus();
        }
    }, []);

    const currentCurrency: ICurrency = useMemo(() => {
        return window.currencies[currency];
    }, [currency]);

    const canSave = useMemo(() => {
        return title.trim().length > 0;
    }, [title]);

    const handleChangeTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(event.currentTarget.value);
    };

    const handleChangeDescription = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(event.currentTarget.value);
    };

    const handleChangeVisibility = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsPublic(event.currentTarget.checked);
    };

    const handleSetOwner = (people: string[]) => {
        setProjectOwner(people.at(0) ?? me);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSetCurrency = (value: number | undefined, currencyType: string) => {
        setHourlyRate(value);
        setCurrency(currencyType);
    };

    const handleSave = () => {
        const project = {
            description,
            projectOwner,
            defaultView: PROJECTVIEW.DEFAULT,
            views: [...PROJECT_DEFAULT_VIEWS],
            currency,
            hourlyRate,
            startDate: starts,
            endDate: ends,
            automations: [],
        };

        onSave(title, project, isPublic);
        handleClose();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" && canSave) {
            handleSave();
        }
    };

    return (
        <Dialog
            title="New project"
            isOpen={open}
            onClose={handleClose}
            onClosed={onClose}
            aria-labelledby="new-project-dialog"
        >
            <div className={Classes.DIALOG_BODY}>
                <FormGroup label="Project name">
                    <InputGroup
                        placeholder={translate("Untitled project")}
                        value={title}
                        size="large"
                        inputRef={handleFocus}
                        autoFocus
                        onChange={handleChangeTitle}
                        onKeyDown={handleKeyDown}
                        data-testid="new-project-title-input"
                    />
                </FormGroup>

                <FormGroup label="Description">
                    <TextArea
                        placeholder="Project description"
                        fill
                        value={description}
                        onChange={handleChangeDescription}
                        data-testid="new-project-description-input"
                    />
                </FormGroup>

                <Grid>
                    <TaskDetailsSection title="Owner" centered>
                        <TaskDetailsAssignees
                            assignees={projectOwner ? [projectOwner] : []}
                            single
                            large
                            taskId="none"
                            onChange={handleSetOwner}
                        />
                    </TaskDetailsSection>
                    <TaskDetailsSection title="Hourly fee" centered>
                        <FeeInputPopup
                            value={hourlyRate}
                            currency={currency}
                            onChange={handleSetCurrency}
                            label={translate("Hourly fee")}
                        >
                            <Tag minimal interactive className="hourly-fee-tag">
                                <strong>
                                    {currentCurrency.symbol} {hourlyRate}
                                </strong>
                            </Tag>
                        </FeeInputPopup>
                    </TaskDetailsSection>
                    <TaskDetailsSection title="Starts on" centered>
                        <DatePickerButton
                            value={starts ?? null}
                            onChange={setStarts}
                            enableTimePicker={false}
                        />
                    </TaskDetailsSection>
                    <TaskDetailsSection title="Ends on" centered>
                        <DatePickerButton value={ends ?? null} onChange={setEnds} enableTimePicker={false} />
                    </TaskDetailsSection>

                    <TaskDetailsSection title="Visibility" centered>
                        <input type="checkbox" checked={isPublic} onChange={handleChangeVisibility} /> &nbsp;
                        Public
                    </TaskDetailsSection>
                </Grid>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button
                        variant="minimal"
                        intent={Intent.NONE}
                        onClick={handleClose}
                        data-testid="new-project-cancel-button"
                    >
                        {translate("Cancel")}
                    </Button>
                    <Button
                        intent={Intent.PRIMARY}
                        disabled={!canSave}
                        onClick={handleSave}
                        data-testid="new-project-save-button"
                    >
                        {translate("Save")}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};
