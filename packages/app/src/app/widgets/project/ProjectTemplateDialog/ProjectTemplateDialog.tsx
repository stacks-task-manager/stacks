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
            title={translate("Project template")}
            icon={<Icon icon="certificate-02" />}
            onClose={handleClose}
            onClosed={onClose}
        >
            <div className={Classes.DIALOG_BODY}>
                <FormGroup label={translate("Title")} labelFor="title-input" labelInfo="*">
                    <InputGroup id="title-input" placeholder={translate("Template title")} large />
                </FormGroup>

                <FormGroup
                    helperText={translate("Describe what does this template contain.")}
                    label={translate("Description")}
                    labelFor="description-input"
                    labelInfo="*"
                >
                    <TextArea id="description-input" placeholder={translate("Template description")} fill />
                </FormGroup>

                <FormGroup
                    label={translate("Project template options")}
                    helperText={translate("Select which options should be included in the template.")}
                >
                    <Row>
                        <Col vertical>
                            <Switch label={translate("Tasks")} checked />
                            <Switch label={translate("Automations")} />
                            <Switch label={translate("Tags")} />
                            <Switch label={translate("Statuses")} />
                        </Col>
                        <Col vertical>
                            <Switch label={translate("Project settings")}>
                                &nbsp;
                                <Icon icon="info-circle" />
                            </Switch>
                            <Switch label={translate("Project interface settings")}>
                                &nbsp;
                                <Icon icon="info-circle" />
                            </Switch>
                            <Switch label={translate("Tasks custom fields")}>
                                &nbsp;
                                <Icon icon="info-circle" />
                            </Switch>
                            <Switch label={translate("Project saved filters")}>
                                &nbsp;
                                <Icon icon="info-circle" />
                            </Switch>
                        </Col>
                    </Row>
                </FormGroup>
            </div>

            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button onClick={handleClose}>{translate("Cancel")}</Button>
                    <Button intent={Intent.PRIMARY}>{translate("Save template")}</Button>
                </div>
            </div>
        </Dialog>
    );
};
