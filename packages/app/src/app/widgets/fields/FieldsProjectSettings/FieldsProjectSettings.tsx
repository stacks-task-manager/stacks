// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Intent, Menu, MenuItem, Popover } from "@blueprintjs/core";
import React, { useState } from "react";

import { BlankSlate, Col, Grid, Icon, Row, Scroller } from "app/components/common";
import { FieldsAddOrEditDialog } from "app/widgets";
import { FIELDTYPEICON, IField } from "@stacks/types";
import { Container, Draggable } from "app/components/draggable";
import { ProjectsActions } from "app/store/actions";
import { getCurrentProjectId, useProjectFields } from "app/hooks";

export const FieldsProjectSettings = ({ disabled }: { disabled?: boolean }) => {
    const [show, setShow] = useState(false);
    const [editedField, setEditedField] = useState<undefined | IField>(undefined);
    const fields = useProjectFields(getCurrentProjectId());

    const handleCloseDialog = () => {
        setShow(false);
        setEditedField(undefined);
    };

    const handleEdit = (field: IField) => {
        setEditedField(field);
        setShow(true);
    };

    const handleReorder = ({ itemId, fromIndex, toIndex }: { itemId: string; fromIndex: number; toIndex: number }) => {
        if (fromIndex === toIndex) return;
        ProjectsActions.reorderFields(itemId, toIndex);
    };

    return (
        <div>
            {fields.length > 0 ? (
                <>
                    <Scroller maxHeight={400} thin>
                        <Container
                            id="project-fields-order"
                            type="field"
                            direction="vertical"
                            onReorder={handleReorder}
                        >
                            {fields.map(field => (
                                <Draggable
                                    key={field.id}
                                    id={field.id}
                                    type="field"
                                    containerId="project-fields-order"
                                    handleClassName="draggable-fields"
                                    className="project-settings-field"
                                >
                                    <a className={Classes.MENU_ITEM}>
                                        <span className="drag-handle draggable-fields">
                                            <Icon icon="drag" />
                                        </span>
                                        <span className={Classes.MENU_ITEM_ICON}>
                                            <Icon
                                                icon={
                                                    FIELDTYPEICON[
                                                    field.type.toUpperCase() as keyof typeof FIELDTYPEICON
                                                    ]
                                                }
                                            />
                                        </span>
                                        <div className={Classes.FILL}>{field.title}</div>
                                        <span className={Classes.MENU_ITEM_LABEL}>
                                            <Popover
                                                content={
                                                    <Menu>
                                                        <MenuItem
                                                            text={translate("Edit")}
                                                            icon={<Icon icon="edit-05" />}
                                                            onClick={() => handleEdit(field)}
                                                        />
                                                        <MenuItem
                                                            text={translate("Delete")}
                                                            intent={Intent.DANGER}
                                                            icon={<Icon icon="trash" />}
                                                            onClick={() =>
                                                                ProjectsActions.removeField(field.id)
                                                            }
                                                        />
                                                    </Menu>
                                                }
                                                placement="bottom-end"
                                            >
                                                <Button
                                                    small
                                                    minimal
                                                    className="tiny"
                                                    icon={<Icon icon="dots-vertical" size={14} />}
                                                />
                                            </Popover>
                                        </span>
                                    </a>
                                </Draggable>
                            ))}
                        </Container>
                    </Scroller>

                    <Grid paddingTop={20}>
                        <Row>
                            <Col justify="right">
                                <Button
                                    disabled={disabled}
                                    intent={Intent.PRIMARY}
                                    icon={<Icon icon="plus" />}
                                    onClick={() => setShow(true)}
                                >
                                    {translate("Add new field")}
                                </Button>
                            </Col>
                        </Row>
                    </Grid>
                </>
            ) : (
                <BlankSlate
                    title={translate("No fields")}
                    icon="magic-wand-01"
                    description={translate("You don t have any custom fields yet Click the button bellow to add your first one")}
                >
                    <Button intent={Intent.PRIMARY} icon={<Icon icon="plus" />} onClick={() => setShow(true)} disabled={disabled}>
                        {translate("Add new field")}
                    </Button>
                </BlankSlate>
            )}

            {show ? <FieldsAddOrEditDialog field={editedField} onClose={handleCloseDialog} /> : null}
        </div>
    );
};
