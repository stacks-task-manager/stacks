// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Classes,
    Dialog,
    FormGroup,
    InputGroup,
    Intent,
    Menu,
    MenuItem,
    NumericInput,
    Popover,
    TextArea,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { FIELD_TYPE_LABELS } from "app/locale/dynamic-messages";
import React, { FunctionComponent, useMemo, useState } from "react";

import { DragDropContext, Draggable, DropResult, Droppable } from "@hello-pangea/dnd";
import { FIELDTYPE, FIELDTYPEICON, IField } from "@stacks/types";
import { Col, Grid, Icon, Row } from "app/components/common";
import { ProjectsActions } from "app/store/actions";
import { uuidv4 } from "app/utils/uuid";
import { ButtonTooltip } from "app/widgets/common";

const FIELD_W_OPTIONS = [FIELDTYPE.CHECKBOXES, FIELDTYPE.DROPDOWN, FIELDTYPE.RADIO];
const FIELD_NUMERIC = [FIELDTYPE.NUMBER, FIELDTYPE.SLIDER];
const FIELD_WO_OPTIONS = [FIELDTYPE.TEXT, FIELDTYPE.TEXTAREA, FIELDTYPE.DATE, FIELDTYPE.SWITCH];

interface FieldsAddOrEditDialogProps {
    field?: IField;
    onClose: () => void;
}

export const FieldsAddOrEditDialog: FunctionComponent<FieldsAddOrEditDialogProps> = ({ field, onClose }) => {
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(true);
    const [type, setType] = useState<FIELDTYPE>(field?.type ?? FIELDTYPE.TEXT);
    const [title, setTitle] = useState(field?.title ?? "");
    const [description, setDescription] = useState(field?.description ?? "");
    const [options, setOptions] = useState<any>(field?.options ?? {});

    const canSave = useMemo(() => {
        return title.length > 0 && type != null;
    }, [title, type]);

    const handleChangeType = (type: FIELDTYPE) => {
        if (FIELD_W_OPTIONS.includes(type)) {
            setOptions(["Option 1", "Options 2"]);
        } else {
            setOptions({});
        }
        setType(type);
    };

    const handleSetTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(event.currentTarget.value);
    };

    const handleSetDescription = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(event.currentTarget.value);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleAddNewOption = () => {
        setOptions([...options, `Option ${options.length + 1}`]);
    };

    const handleRemoveOption = (index: number) => {
        setOptions(options.filter((o: string, i: number) => i !== index));
    };

    const handleUpdateOption = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
        setOptions(
            options.map((o: string, i: number) => {
                if (i === index) {
                    return event.currentTarget.value;
                }
                return o;
            })
        );
    };

    const handleSetMin = (valueAsNumber: number, valueAsString: string) => {
        setOptions({
            ...options,
            min: valueAsString,
        });
    };
    const handleSetMax = (valueAsNumber: number, valueAsString: string) => {
        setOptions({
            ...options,
            max: valueAsString,
        });
    };
    const handleSetStep = (valueAsNumber: number, valueAsString: string) => {
        setOptions({
            ...options,
            step: valueAsString,
        });
    };

    const handleSaveField = async () => {
        const updatedField: IField = {
            id: field?.id ?? uuidv4(),
            title,
            description,
            type,
        };

        if (!FIELD_WO_OPTIONS.includes(type)) {
            updatedField.options = options;
        }

        setSaving(true);
        await ProjectsActions.upsertField(updatedField);
        handleClose();
    };

    const handleReorder = (result: DropResult) => {
        const { destination, source } = result;
        if (!destination) return;
        if (destination.index === source.index) return;

        const newOptions = [...options];
        const movedOption = newOptions[source.index];

        newOptions.splice(source.index, 1);
        newOptions.splice(destination.index, 0, movedOption);
        setOptions(newOptions);
    };

    return (
        <Dialog
            isOpen={open}
            title={field?.id != null ? translate("Edit custom field") : translate("Add custom field")}
            onClose={handleClose}
            onClosed={onClose}
        >
            <form>
                <div className={Classes.DIALOG_BODY}>
                    <Row gutter={15}>
                        <Col>
                            <FormGroup
                                label={translate("Field title")}
                                labelFor="field-title"
                                style={{ width: "100%" }}
                            >
                                <InputGroup
                                    id="field-title"
                                    placeholder={translate("Field title")}
                                    value={title}
                                    fill
                                    onChange={handleSetTitle}
                                />
                            </FormGroup>
                        </Col>
                        <Col>
                            <FormGroup
                                label={translate("Field type")}
                                labelFor="text-input"
                                style={{ width: "100%" }}
                            >
                                <Popover
                                    minimal
                                    placement="bottom"
                                    content={
                                        <Menu>
                                            {Object.keys(FIELDTYPE).map(fieldType => (
                                                <MenuItem
                                                    key={fieldType}
                                                    icon={
                                                        <Icon
                                                            icon={
                                                                FIELDTYPEICON[
                                                                    fieldType as keyof typeof FIELDTYPEICON
                                                                ]
                                                            }
                                                        />
                                                    }
                                                    text={
                                                        FIELD_TYPE_LABELS[
                                                            FIELDTYPE[fieldType as keyof typeof FIELDTYPE]
                                                        ]
                                                    }
                                                    onClick={() =>
                                                        handleChangeType(
                                                            FIELDTYPE[fieldType as keyof typeof FIELDTYPE]
                                                        )
                                                    }
                                                />
                                            ))}
                                        </Menu>
                                    }
                                    fill
                                    matchTargetWidth
                                >
                                    <Button
                                        icon={
                                            <Icon
                                                icon={
                                                    FIELDTYPEICON[
                                                        type.toUpperCase() as keyof typeof FIELDTYPEICON
                                                    ]
                                                }
                                            />
                                        }
                                        fill
                                        alignText="left"
                                        rightIcon={<Icon icon="chevron-down" />}
                                    >
                                        {FIELD_TYPE_LABELS[type]}
                                    </Button>
                                </Popover>
                            </FormGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <FormGroup
                                label={translate("Description")}
                                labelFor="field-description"
                                style={{ width: "100%" }}
                            >
                                <TextArea
                                    id="field-description"
                                    placeholder={translate("Add more detail on this field")}
                                    value={description}
                                    fill
                                    onChange={handleSetDescription}
                                />
                            </FormGroup>
                        </Col>
                    </Row>

                    {FIELD_NUMERIC.includes(type) ? (
                        <FormGroup label={translate("Options")} style={{ width: "100%" }}>
                            <Row gutter={10}>
                                <Col>
                                    <NumericInput
                                        value={options.min}
                                        fill
                                        placeholder={translate("Min value")}
                                        onValueChange={handleSetMin}
                                    />
                                </Col>
                                <Col>
                                    <NumericInput
                                        value={options.max}
                                        fill
                                        placeholder={translate("Max value")}
                                        onValueChange={handleSetMax}
                                    />
                                </Col>
                                <Col>
                                    <NumericInput
                                        value={options.step}
                                        fill
                                        placeholder={translate("Step size")}
                                        onValueChange={handleSetStep}
                                    />
                                </Col>
                            </Row>
                        </FormGroup>
                    ) : null}

                    {FIELD_W_OPTIONS.includes(type) ? (
                        <Grid align="left" gap={0}>
                            <FormGroup label={translate("Options")} style={{ width: "100%" }}>
                                <DragDropContext onDragEnd={handleReorder}>
                                    <Droppable droppableId="droppable">
                                        {provided => (
                                            <div {...provided.droppableProps} ref={provided.innerRef}>
                                                <Grid>
                                                    {options.map((option: string, i: number) => (
                                                        <Draggable key={i} draggableId={`${i}`} index={i}>
                                                            {provided => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    className="field-option"
                                                                >
                                                                    <Row gutter={10}>
                                                                        <Col align="center" fill gap={5}>
                                                                            <span
                                                                                {...provided.dragHandleProps}
                                                                                className="drag-handle"
                                                                            >
                                                                                <Icon icon="drag" />
                                                                            </span>
                                                                            <InputGroup
                                                                                fill
                                                                                placeholder={translate(
                                                                                    "Option title"
                                                                                )}
                                                                                value={option}
                                                                                onChange={e =>
                                                                                    handleUpdateOption(e, i)
                                                                                }
                                                                            />
                                                                        </Col>
                                                                        <Col align="center" collapse>
                                                                            <ButtonTooltip
                                                                                tooltipProps={{
                                                                                    content:
                                                                                        translate(
                                                                                            "Delete option"
                                                                                        ),
                                                                                    placement: "top",
                                                                                }}
                                                                                buttonProps={{
                                                                                    small: true,
                                                                                    minimal: true,
                                                                                    icon: (
                                                                                        <Icon icon="trash" />
                                                                                    ),
                                                                                    intent: Intent.DANGER,
                                                                                    onClick: () =>
                                                                                        handleRemoveOption(i),
                                                                                }}
                                                                            />
                                                                        </Col>
                                                                    </Row>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </Grid>
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            </FormGroup>

                            <Button
                                size="small"
                                variant="minimal"
                                icon={<Icon icon="plus" />}
                                onClick={handleAddNewOption}
                            >
                                {translate("Add option")}
                            </Button>
                        </Grid>
                    ) : null}
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button size="small" variant="minimal" onClick={onClose}>
                            {translate("Cancel")}
                        </Button>
                        <Button
                            small
                            intent={Intent.PRIMARY}
                            disabled={!canSave}
                            loading={saving}
                            onClick={handleSaveField}
                        >
                            {translate("Save")}
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    );
};
