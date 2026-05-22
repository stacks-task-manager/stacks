// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Dialog, Intent, Switch, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import { produce } from "immer";
import xor from "lodash/xor";
import React, { useMemo, useState } from "react";

import { Container, Draggable } from "app/components/draggable";
import { ITableColumns } from "@stacks/types";
import { objectOrder } from "app/utils/array";
import { Icon } from "../../Icon/Icon";
import { Scroller } from "../../Scroller/Scroller";

interface TableColumnPickerProps<T> {
    columns: ITableColumns<T>;
    visibleColumns: string[];
    order: string[];
    onChange: (visibility: string[], order: string[]) => void;
}
export function TableColumnPicker<T>({
    columns,
    visibleColumns,
    order,
    onChange,
}: TableColumnPickerProps<T>) {
    const [showOrderDialog, setShowOrderDialog] = useState(false);

    const handleToggleDialog = () => {
        setShowOrderDialog(!showOrderDialog);
    };

    return (
        <th className="with-menu">
            <div className="table-header-cell">
                <Tooltip
                    placement="top-end"
                    content="Manage table columns"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...tooltipProps }) => (
                        <Button
                            {...tooltipProps}
                            minimal
                            small
                            icon={<Icon icon="settings-04" size={14} />}
                            ref={ref}
                            className="table-menu-button"
                            onClick={handleToggleDialog}
                        />
                    )}
                />
            </div>

            {showOrderDialog ? (
                <ColumnsOrderDialog
                    columns={columns}
                    visible={visibleColumns}
                    order={order}
                    onChange={onChange}
                    onClose={() => setShowOrderDialog(false)}
                />
            ) : null}
        </th>
    );
}

interface ColumnsOrderDialogProps<T> {
    columns: ITableColumns<T>;
    visible: string[];
    order: string[];
    onChange: (visibility: string[], order: string[]) => void;
    onClose: () => void;
}
function ColumnsOrderDialog<T>({ columns, visible, order, onChange, onClose }: ColumnsOrderDialogProps<T>) {
    const [open, setOpen] = useState(true);
    const [columnsOrder, setColumnsOrder] = useState<string[]>(order);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(visible);

    const orderedColumns = useMemo(() => objectOrder(columns, columnsOrder, true), [columns, columnsOrder]);

    const canSave = useMemo(() => {
        return order !== columnsOrder || visible !== visibleColumns;
    }, [order, columnsOrder, visible, visibleColumns]);

    const handleReorder = ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) => {
        if (fromIndex === toIndex) return;

        setColumnsOrder(
            produce(columnsOrder, drafOrder => {
                const movedItem = drafOrder[fromIndex + 1];
                drafOrder.splice(fromIndex + 1, 1);
                drafOrder.splice(toIndex + 1, 0, movedItem);
            })
        );
    };

    const handleToggleVisibility = (column: string) => {
        setVisibleColumns(xor(visibleColumns, [column]));
    };

    const handleApply = () => {
        onChange(visibleColumns, columnsOrder);
        handleClose();
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleClosed = () => {
        onClose();
    };

    return (
        <Dialog
            isOpen={open}
            title="Manage columns order"
            className="table-column-manager"
            onClose={handleClose}
            onClosed={handleClosed}
        >
            <div className={Classes.DIALOG_BODY} style={{ paddingBottom: 0 }}>
                Drag to reorder the columns and check the switch to make them visible in the table.
            </div>

            <Scroller thin vertical maxHeight={300} shadows>
                <div style={{ padding: "0 5px" }}>
                    <Container
                        id="table-columns-order"
                        type="column"
                        direction="vertical"
                        onReorder={handleReorder}
                    >
                        {Object.keys(orderedColumns)
                            .slice(1)
                            // .filter((column: ITableColumn) => !column.unhideable)
                            .map((col: string) => {
                                const column = columns[col];
                                return (
                                    <Draggable
                                        key={col}
                                        id={col}
                                        type="column"
                                        containerId="table-columns-order"
                                        handleClassName="draggable-column"
                                    >
                                        <div className={Classes.MENU_ITEM} style={{ cursor: "default" }}>
                                            <span
                                                className={classNames(
                                                    "draggable-column",
                                                    Classes.MENU_ITEM_ICON
                                                )}
                                            >
                                                <Icon icon="drag" />
                                            </span>
                                            <div
                                                className={classNames(
                                                    Classes.FILL,
                                                    Classes.TEXT_OVERFLOW_ELLIPSIS
                                                )}
                                            >
                                                {column.title}
                                            </div>
                                            <span className={Classes.MENU_ITEM_LABEL}>
                                                <Switch
                                                    checked={visibleColumns.includes(col)}
                                                    onChange={() => handleToggleVisibility(col)}
                                                />
                                            </span>
                                        </div>
                                    </Draggable>
                                );
                            })}
                    </Container>
                </div>
            </Scroller>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button variant="minimal" size="small" onClick={handleClose}>
                        {translate("Cancel")}
                    </Button>
                    <Button size="small" intent={Intent.PRIMARY} disabled={!canSave} onClick={handleApply}>
                        {translate("Save")}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
