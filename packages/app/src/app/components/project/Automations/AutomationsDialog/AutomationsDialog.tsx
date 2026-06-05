// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Alignment,
    Button,
    ButtonGroup,
    Classes,
    Dialog,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Switch,
    Tooltip,
} from "@blueprintjs/core";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import React, { FunctionComponent, useEffect, useState } from "react";
import { ProjectsAPI } from "app/api";
import { BlankSlate, Grid, Icon } from "app/components/common";
import { APPICONS, AUTOMATION_DO, IAutomation, IAutomationAction, IProject } from "@stacks/types";
import { ProjectsActions, RecordActions } from "app/store/actions";
import Toast from "app/utils/toast";
import { uuidv4 } from "app/utils/uuid";
import { Automation } from "../Automation/Automation";
import { AutomationWizard } from "../AutomationWizard/AutomationWizard";
import { useCurrentProject } from "app/hooks";

interface IAutomationsDialogProps {
    onClose: () => void;
}
export const AutomationsDialog: FunctionComponent<IAutomationsDialogProps> = ({ onClose }) => {
    const { project } = useCurrentProject();
    const automations = project?.automations ?? [];
    const [value, setValue] = useState<Partial<IAutomation> | undefined | null>(null);
    const [open, setOpen] = useState(true);
    const [showNew, setShowNew] = useState(false);

    const handleSetValue = (automation: IAutomation | undefined) => {
        setValue(automation);
        setShowNew(false);
    };

    const handleToggleStatus = (automationId: string) => {
        const automation = automations.find(a => a.id === automationId);
        if (!automation) return;
        ProjectsActions.upsertAutomation({ ...automation, enabled: !automation.enabled });
    };

    const handleEditAutomation = (event: React.MouseEvent, automation: IAutomation) => {
        event.preventDefault();

        setValue(automation);
        setShowNew(false);
    };

    const handleRemoveAutomation = (event: React.MouseEvent, automation: IAutomation) => {
        event.preventDefault();

        ProjectsActions.removeAutomation(automation.id);
    };

    const handleCancel = () => {
        setValue(null);
        setShowNew(false);
    };

    const handleCopyAutomation = (automation: IAutomation, sourceProjectId: string) => {
        const copiedAutomation = structuredClone(automation);
        copiedAutomation.id = "";
        delete copiedAutomation.value;
        let alert = false;

        for (const action of copiedAutomation.actions as Partial<IAutomationAction>[]) {
            action.id = uuidv4();
            if (action.do === AUTOMATION_DO.MOVE && project?.id !== sourceProjectId) {
                action.value = undefined;
                action.editing = true;
                alert = true;
            }
        }
        setValue(copiedAutomation);

        if (alert) {
            Toast.info(
                "Some of the automation actions could not be replicated since it contains specific project info."
            );
        }
    };

    return (
        <Dialog
            isOpen={open}
            title={translate("Manage automations")}
            onClose={() => setOpen(false)}
            onClosed={onClose}
        >
            {!showNew && value === null && (
                <>
                    <Grid gap={12} padding={[20, 30]}>
                        <DragDropContext onDragEnd={ProjectsActions.reorderAutomations}>
                            <Droppable droppableId="droppable">
                                {provided => (
                                    <div
                                        className="automation-actions"
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                    >
                                        {automations.map((automation, index) => (
                                            <Draggable
                                                key={automation.id}
                                                draggableId={automation.id}
                                                index={index}
                                            >
                                                {provided => (
                                                    <div
                                                        className="automation-row"
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                    >
                                                        <div
                                                            className="automation-row--drag"
                                                            {...provided.dragHandleProps}
                                                        >
                                                            <Icon icon="drag" size={18} />
                                                        </div>
                                                        <div className="automation-row--name">
                                                            {automation.title}
                                                        </div>
                                                        <div className="automation-row--options">
                                                            <Tooltip
                                                                content={
                                                                    automation.enabled
                                                                        ? "Disable automation"
                                                                        : "Enable automation"
                                                                }
                                                                placement="top"
                                                            >
                                                                <Switch
                                                                    checked={automation.enabled}
                                                                    alignIndicator={Alignment.RIGHT}
                                                                    onChange={() =>
                                                                        handleToggleStatus(automation.id)
                                                                    }
                                                                />
                                                            </Tooltip>

                                                            <Popover
                                                                content={
                                                                    <Menu>
                                                                        <MenuItem
                                                                            text="Edit automation"
                                                                            icon={<Icon icon="edit-05" />}
                                                                            onClick={(
                                                                                event: React.MouseEvent
                                                                            ) =>
                                                                                handleEditAutomation(
                                                                                    event,
                                                                                    automation
                                                                                )
                                                                            }
                                                                        />
                                                                        <MenuDivider />
                                                                        <MenuItem
                                                                            text="Delete automation"
                                                                            icon={<Icon icon="trash" />}
                                                                            intent={Intent.DANGER}
                                                                            onClick={(
                                                                                event: React.MouseEvent
                                                                            ) =>
                                                                                handleRemoveAutomation(
                                                                                    event,
                                                                                    automation
                                                                                )
                                                                            }
                                                                        />
                                                                    </Menu>
                                                                }
                                                                placement="bottom-end"
                                                                renderTarget={({ isOpen, ref, ...props }) => (
                                                                    <Button
                                                                        {...props}
                                                                        small
                                                                        minimal
                                                                        icon={<Icon icon="dots-vertical" />}
                                                                        active={isOpen}
                                                                        ref={ref}
                                                                    />
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}

                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>

                        {automations.length === 0 && (
                            <BlankSlate
                                title={translate("No automations")}
                                icon="cpu-chip-01"
                                description={translate("You don t have any automations yet Click the button bellow to add your first one")}
                            >
                                <NewAutomationButton
                                    onClick={() => setShowNew(true)}
                                    onCopy={handleCopyAutomation}
                                />
                            </BlankSlate>
                        )}
                    </Grid>

                    {automations.length > 0 && (
                        <div className={Classes.DIALOG_FOOTER}>
                            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                                <Button variant="minimal" onClick={() => setOpen(false)}>
                                    {translate("Cancel")}
                                </Button>
                                <NewAutomationButton
                                    onClick={() => setShowNew(true)}
                                    onCopy={handleCopyAutomation}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
            {value !== null && <Automation automation={value} onCancel={handleCancel} />}
            {showNew && value === null && <AutomationWizard onSelect={handleSetValue} />}
        </Dialog>
    );
};

interface NewAutomationButtonProps {
    onClick: () => void;
    onCopy: (automation: IAutomation, sourceProjectId: string) => void;
}
const NewAutomationButton: FunctionComponent<NewAutomationButtonProps> = ({ onClick, onCopy }) => {
    return (
        <ButtonGroup>
            <Button intent={Intent.PRIMARY} icon={<Icon icon="plus" />} onClick={onClick}>
                {translate("Add automation")}
            </Button>
            <Popover
                content={
                    <Menu>
                        <MenuItem text="Copy from project..." icon={<Icon icon="copy" />}>
                            <ProjectMenu onCopy={onCopy} />
                        </MenuItem>
                    </Menu>
                }
                placement="bottom-end"
                renderTarget={({ isOpen, ref, ...props }) => (
                    <Button
                        {...props}
                        intent={Intent.PRIMARY}
                        icon={<Icon icon="chevron-down" />}
                        style={{ marginLeft: 0 }}
                        active={isOpen}
                        ref={ref}
                    />
                )}
            />
        </ButtonGroup>
    );
};

interface ProjectMenuProps {
    onCopy: (automation: IAutomation, sourceProjectId: string) => void;
}
const ProjectMenu: FunctionComponent<ProjectMenuProps> = ({ onCopy }) => {
    const projects = RecordActions.getProjects();

    return (
        <>
            {projects
                .filter(project => project.id != null)
                .map(project => (
                    <MenuItem text={project.text} icon={<Icon icon={APPICONS.PROJECT} />} key={project.id}>
                        <ProjectAutomations projectId={project.id} onClick={onCopy} />
                    </MenuItem>
                ))}
        </>
    );
};

const ProjectAutomations = ({
    projectId,
    onClick,
}: {
    projectId: string;
    onClick: (automation: IAutomation, sourceProjectId: string) => void;
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [project, setProject] = useState<IProject | undefined>();

    const loadProject = async () => {
        setIsLoading(true);
        const loadedProject = await ProjectsAPI.load(projectId);

        if (loadedProject) {
            setProject(loadedProject);
        } else {
            undefined;
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadProject();
    }, [projectId]);

    if (isLoading) {
        return (
            <>
                <MenuItem className={Classes.SKELETON} text="Automation" icon={<Icon icon="cpu-chip-01" />} />
                <MenuItem className={Classes.SKELETON} text="Automation" icon={<Icon icon="cpu-chip-01" />} />
                <MenuItem className={Classes.SKELETON} text="Automation" icon={<Icon icon="cpu-chip-01" />} />
            </>
        );
    }

    if (!project || (project && project.automations.length === 0)) {
        return (
            <BlankSlate small title="There are no automations for the selected project" icon="cpu-chip-01" />
        );
    }

    return (
        <>
            {project.automations.map((automation: IAutomation) => (
                <MenuItem
                    text={automation.title}
                    key={automation.id}
                    icon={<Icon icon="cpu-chip-01" />}
                    onClick={() => onClick(automation, projectId)}
                />
            ))}
        </>
    );
};
