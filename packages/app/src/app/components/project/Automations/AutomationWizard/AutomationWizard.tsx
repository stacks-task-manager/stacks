// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Colors } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { Col, Grid, Icon, Row } from "app/components/common";
import { StacksPicker } from "app/components/project";
import { AUTOMATIOD_DO, AUTOMATION_EVENT, IAutomation } from "@stacks/types";
import { uuidv4 } from "app/utils/uuid";

interface IAutomationWizardProps {
    onSelect: (automation: IAutomation | undefined) => void;
}
export const AutomationWizard: FunctionComponent<IAutomationWizardProps> = ({ onSelect }) => {
    const handleCreatedStartDate = () => {
        onSelect({
            id: uuidv4(),
            title: "",
            enabled: true,
            event: AUTOMATION_EVENT.CREATED,
            actions: [
                {
                    id: uuidv4(),
                    do: AUTOMATIOD_DO.STARTDATE,
                    value: "",
                    editing: true,
                },
            ],
        });
    };

    const handleCreatedTag = () => {
        onSelect({
            id: uuidv4(),
            title: "",
            enabled: true,
            event: AUTOMATION_EVENT.CREATED,
            actions: [
                {
                    id: uuidv4(),
                    do: AUTOMATIOD_DO.ADDTAG,
                    value: [],
                    editing: true,
                },
            ],
        });
    };

    const handleMovedStack = (stacksIds: string[]) => {
        onSelect({
            id: uuidv4(),
            title: "",
            enabled: true,
            event: AUTOMATION_EVENT.MOVED,
            value: stacksIds.at(-1),
            actions: [
                {
                    id: uuidv4(),
                    do: AUTOMATIOD_DO.DUEDATE,
                    value: "",
                    editing: true,
                },
            ],
        });
    };

    const handleCompletedTask = () => {
        onSelect({
            id: uuidv4(),
            title: "",
            enabled: true,
            event: AUTOMATION_EVENT.DONE,
            actions: [
                {
                    id: uuidv4(),
                    do: AUTOMATIOD_DO.ARCHIVE,
                    value: [],
                    editing: true,
                },
            ],
        });
    };

    const handleStartedTask = () => {
        onSelect({
            id: uuidv4(),
            title: "",
            enabled: true,
            event: AUTOMATION_EVENT.STARTED,
            actions: [
                {
                    id: uuidv4(),
                    do: AUTOMATIOD_DO.MOVE,
                    value: [],
                    editing: true,
                },
            ],
        });
    };

    return (
        <div className={Classes.DIALOG_BODY}>
            <div className="automation-wizard">
                <p className={Classes.TEXT_MUTED}>
                    {translate("Select from predefined automations or create a custom automation")}
                </p>

                <Grid gap={15}>
                    <Row gutter={15}>
                        <Col>
                            <AutomationButton
                                when="A task is created"
                                then="Set start date"
                                iconLeft="plus-circle"
                                iconRight="calendar-date"
                                iconLeftColor={Colors.GREEN3}
                                iconRightColor={Colors.RED3}
                                onClick={handleCreatedStartDate}
                            />
                        </Col>
                        <Col>
                            <AutomationButton
                                when="A task is created"
                                then="Add a tag"
                                iconLeft="plus-circle"
                                iconRight="tag"
                                iconLeftColor={Colors.GREEN3}
                                iconRightColor={Colors.GOLD3}
                                onClick={handleCreatedTag}
                            />
                        </Col>
                        <Col>
                            <div style={{ width: "100%" }}>
                                <StacksPicker value={[]} singleSelection onChange={handleMovedStack} fill>
                                    <AutomationButton
                                        when="A task is moved"
                                        then="Set due date"
                                        iconLeft="switch-horizontal-01"
                                        iconRight="calendar-date"
                                        iconLeftColor={Colors.BLUE3}
                                        iconRightColor={Colors.RED3}
                                    />
                                </StacksPicker>
                            </div>
                        </Col>
                    </Row>
                    <Row gutter={15}>
                        <Col>
                            <AutomationButton
                                when="A task is completed"
                                then="Archive it"
                                iconLeft="check-square"
                                iconRight="archive"
                                iconLeftColor={Colors.CERULEAN3}
                                iconRightColor={Colors.VERMILION3}
                                onClick={handleCompletedTask}
                            />
                        </Col>
                        <Col>
                            <AutomationButton
                                when="A task is started"
                                then="Move it"
                                iconLeft="calendar-date"
                                iconRight="switch-horizontal-01"
                                iconLeftColor={Colors.RED3}
                                iconRightColor={Colors.BLUE3}
                                onClick={handleStartedTask}
                            />
                        </Col>
                        <Col align="stretch">
                            <button onClick={() => onSelect(undefined)}>
                                <Icon icon="plus" />
                                {translate("Create new")}
                            </button>
                        </Col>
                    </Row>
                </Grid>
            </div>
        </div>
    );
};

interface IAutomationButtonProps {
    when: string;
    then: string;
    iconLeft: string;
    iconLeftColor?: string;
    iconRight: string;
    iconRightColor?: string;
    onClick?: () => void;
}
const AutomationButton: FunctionComponent<IAutomationButtonProps> = ({
    when,
    then,
    iconLeft,
    iconLeftColor,
    iconRight,
    iconRightColor,
    onClick,
}) => {
    return (
        <button onClick={onClick}>
            <div className="automation-wizard__symbols">
                <Icon icon={iconLeft} size={18} color={iconLeftColor} />
                <Icon icon="chevron-right" size={13} />
                <Icon icon={iconRight} size={18} color={iconRightColor} />
            </div>
            <div className="automation-wizard__description">
                <span className="automation-wizard__action">
                    {translate("when")}
                </span>{" "}
                {when}
                <span className="automation-wizard__action">
                    {translate("then")}
                </span>
                {then}
            </div>
        </button>
    );
};
