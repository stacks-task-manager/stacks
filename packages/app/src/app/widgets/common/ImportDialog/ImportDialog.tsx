// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Checkbox,
    Classes,
    Dialog,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Spinner,
    Tooltip,
} from "@blueprintjs/core";
import React, { FunctionComponent, useMemo, useState } from "react";

import {
    Col,
    Grid,
    Icon,
    Row,
    Scroller,
    Table,
    TableBody,
    TableBodyCell,
    TableHead,
    TableHeaderCell,
    TableRow,
} from "app/components/common";
import classNames from "classnames";
const COLUMN_WIDTH = 250;

export interface ImportSelectedFields {
    [field: string]: number;
}

type Column = {
    id: string;
    title: string | React.ReactNode;
    required?: boolean;
};

interface ImportDialogProps {
    data: Array<string[]>;
    total: number;
    columns: Column[];
    loading?: boolean;
    onSave: (fields: ImportSelectedFields, skipFirstRow: boolean) => void;
    onClose: () => void;
}

export const ImportDialog: FunctionComponent<ImportDialogProps> = ({
    data,
    total,
    columns,
    loading,
    onSave,
    onClose,
}) => {
    const [open, setOpen] = useState(true);
    const [fields, setFields] = useState<ImportSelectedFields>({});
    const [skipFirstRow, setSkipFirstRow] = useState(false);

    const canImport = useMemo(() => {
        return !columns.some(column => column.required === true && !fields.hasOwnProperty(column.id));
    }, [fields, columns]);

    return (
        <Dialog
            title="Import"
            isOpen={open}
            className="import-dialog"
            style={{ width: 600 }}
            onClose={handleClose}
            onClosed={handleClosed}
        >
            {!loading ? (
                <>
                    <div className={Classes.DIALOG_BODY}>
                        <Grid>
                            <p>
                                Found <strong>{total}</strong> rows in this file. Match the rows information
                                with the right column.
                            </p>

                            <Scroller thin>
                                <Table>
                                    <TableHead>
                                        {(data.at(0) ?? []).map((col, i) => (
                                            <TableHeaderCell key={i} name={col} width={COLUMN_WIDTH}>
                                                <ColumnTypePicker
                                                    fields={fields}
                                                    index={i}
                                                    columns={columns}
                                                    onChange={handleSelectField}
                                                    onRemove={handleRemoveIndex}
                                                />
                                            </TableHeaderCell>
                                        ))}
                                    </TableHead>
                                    <TableBody>
                                        {data.map((row, i) => (
                                            <TableRow
                                                key={i}
                                                className={classNames({
                                                    [Classes.TEXT_DISABLED]: skipFirstRow && i === 0,
                                                })}
                                            >
                                                {row.map((col, j) => (
                                                    <TableBodyCell key={j}>{col}</TableBodyCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Scroller>

                            <Checkbox
                                label="Skip importing the first row"
                                checked={skipFirstRow}
                                onChange={() => setSkipFirstRow(!skipFirstRow)}
                            />

                            <p className={classNames("text-center", Classes.TEXT_MUTED)}>
                                <strong>{Object.keys(fields).length}</strong> out of{" "}
                                {Object.keys(columns).length} columns will be imported.
                            </p>
                        </Grid>
                    </div>

                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button variant="minimal" onClick={handleClose}>
                                {translate("Cancel")}
                            </Button>
                            <Button intent={Intent.PRIMARY} disabled={!canImport} onClick={handleSave}>
                                Start import
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <Grid padding={[100, 20]}>
                    <Spinner />
                </Grid>
            )}
        </Dialog>
    );

    function handleSelectField(field: string, index: number) {
        const newFields = { ...fields };

        const entries = Object.entries(fields);
        const entryByIndex = entries.find(entry => entry.at(1) === index);

        if (entryByIndex != null) {
            delete newFields[entryByIndex.at(0)!];
        }

        if (field) {
            newFields[field] = index;
        } else {
            delete newFields[field];
        }

        setFields({
            ...newFields,
            [field]: index,
        });
    }

    function handleRemoveIndex(index: number) {
        const newFields = { ...fields };

        const entries = Object.entries(fields);
        const entryByIndex = entries.find(entry => entry.at(1) === index);

        if (entryByIndex != null) {
            delete newFields[entryByIndex.at(0)!];
        }

        setFields({ ...newFields });
    }

    function handleClosed() {
        onClose();
    }

    function handleClose() {
        setOpen(false);
    }

    function handleSave() {
        onSave(fields, skipFirstRow);
        handleClose();
    }
};

interface ColumnTypePickerProps {
    fields: ImportSelectedFields;
    index: number;
    columns: Column[];
    onChange: (field: string, index: number) => void;
    onRemove: (index: number) => void;
}

const ColumnTypePicker: FunctionComponent<ColumnTypePickerProps> = ({
    fields,
    index,
    columns,
    onChange,
    onRemove,
}) => {
    const selectedField = useMemo(() => {
        const entries = Object.entries(fields);
        const entry = entries.find(entry => entry.at(1) === index);
        if (entry) return entry.at(0);
        return undefined;
    }, [fields, index]);

    const selectedFieldTitle = useMemo(() => {
        if (!selectedField) return "Select field";
        return columns.find(column => column.id === selectedField)?.title;
    }, [selectedField]);

    return (
        <Popover
            placement="bottom"
            content={
                <Scroller thin vertical maxHeight={300}>
                    <Menu>
                        {columns.map((col: Column) => (
                            <MenuItem
                                key={col.id}
                                text={`${col.title}${col.required ? "*" : ""}`}
                                disabled={fields.hasOwnProperty(col.id) && col.id !== selectedField}
                                labelElement={selectedField === col.id ? <Icon icon="check" /> : null}
                                onClick={() => onChange(col.id, index)}
                            />
                        ))}
                        {selectedField != null ? (
                            <>
                                <MenuDivider />
                                <MenuItem
                                    text="Do not import"
                                    icon={<Icon icon="x-close" />}
                                    onClick={() => onRemove(index)}
                                />
                            </>
                        ) : null}
                    </Menu>
                </Scroller>
            }
        >
            <Row className="column-type-picker">
                <Col align="center">
                    {selectedFieldTitle} <Icon icon="chevron-down" />
                    {selectedField == null ? (
                        <Tooltip
                            content="This data won't be imported. Select a field to import it."
                            placement="top"
                        >
                            <Icon icon="alert-circle" color="#ff0000" />
                        </Tooltip>
                    ) : null}
                </Col>
            </Row>
        </Popover>
    );
};
