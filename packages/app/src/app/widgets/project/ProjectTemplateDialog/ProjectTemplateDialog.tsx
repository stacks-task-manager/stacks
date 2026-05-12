// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Switch, TextArea } from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";
import { Col, Icon, Row } from "app/components/common";

interface ProjectTemplateDialogPros {
    onClose: () => void;
}

export const ProjectTemplateDialog: FunctionComponent<ProjectTemplateDialogPros> = ({ onClose }) => {
    const [open, setOpen] = useState(true);

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <Dialog
            isOpen={open}
            title="Project template"
            icon={<Icon icon="certificate-02" />}
            onClose={handleClose}
            onClosed={onClose}
        >
            <div className={Classes.DIALOG_BODY}>
                <FormGroup label="Title" labelFor="title-input" labelInfo="*">
                    <InputGroup id="title-input" placeholder="Template title" large />
                </FormGroup>

                <FormGroup
                    helperText="Describe what does this template contain."
                    label="Description"
                    labelFor="description-input"
                    labelInfo="*"
                >
                    <TextArea id="description-input" placeholder="Template description" fill />
                </FormGroup>

                <FormGroup
                    label="Project template options"
                    helperText="Select which options should be included in the template."
                >
                    <Row>
                        <Col vertical>
                            <Switch label="Tasks" checked />
                            <Switch label="Automations" />
                            <Switch label="Tags" />
                            <Switch label="Statuses" /></Col>
                        <Col vertical>
                            <Switch label="Project settings">
                                &nbsp;
                                <Icon icon="info-circle" />
                            </Switch>
                            <Switch label="Project interface settings">
                                &nbsp;
                                <Icon icon="info-circle" />
                            </Switch>
                            <Switch label="Tasks custom fields">
                                &nbsp;
                                <Icon icon="info-circle" />
                            </Switch>
                            <Switch label="Project saved filters">
                                &nbsp;
                                <Icon icon="info-circle" />
                            </Switch>
                        </Col>
                    </Row>

                </FormGroup>
            </div>

            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button onClick={handleClose}>
                        {translate("Cancel")}
                    </Button>
                    <Button intent={Intent.PRIMARY}>Save template</Button>
                </div>
            </div>
        </Dialog>
    );
};
