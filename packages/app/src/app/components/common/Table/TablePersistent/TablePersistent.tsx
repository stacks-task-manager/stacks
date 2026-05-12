// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    DragDropContext,
    Draggable,
    DropResult,
    ResponderProvided
} from "@hello-pangea/dnd";
import classNames from "classnames";
import noop from "lodash/noop";
import React, { useMemo } from "react";

import { ITableColumns } from "@stacks/types";
import { useStorage } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { FlattenedItem, flattenTree, objectOrder } from "app/utils/array";
import { BlankSlate, Icon } from "../..";
import { Lazy } from "../../LazyLoad/LazyLoad";
import { Table } from "../Table/Table";
import { TableBody } from "../TableBody/TableBody";
import { TableBodyCell } from "../TableBodyCell/TableBodyCell";
import { TableColumnPicker } from "../TableColumnPicker/TableColumnPicker";
import { TableHead } from "../TableHead/TableHead";
import { TableHeaderCell } from "../TableHeaderCell/TableHeaderCell";
import { TableLevelIndicator } from "../TableLevelIndicator/TableLevelIndicator";
import { TableRowPlaceholder } from "../TableRowPlaceholder/TableRowPlaceholder";
import { TableSection, TableSectionCell } from "../TableSection/TableSection";
import { TablePersistentStore } from "./store";
import { formatDate } from "app/utils/date";

export type TablePersistentData<T> = T & {
    // '{}' can be replaced with 'any'
    id: string;
    children?: TablePersistentData<T>[];
};

export interface TablePersistentSectionCellProps<T> {
    title: string;
    column: string;
    section: TablePersistentGroupData<T>;
}

export interface TablePersistentCellCallbackProps<T> {
    tableId: string;
    row: TablePersistentData<T>;
    column: string;
}

export interface TablePersistentCellProps<T> extends TablePersistentCellCallbackProps<T> {
    callback?: () => void;
}

export interface TablePersistentSectionProps<T> {
    isOpen?: boolean;
    group: TablePersistentGroupData<T>;
    columns: number;
    onToggle?: () => void;

}

export interface TablePersistentGroupProps {
    groupId: string;
    title: string;
    count: number;
}

export interface TablePersistentBlankSlate {
    title?: string;
    description: string;
    icon: string;
}

export interface TablePersistentGroupData<T> {
    groupId: string;
    title: string;
    defaultExpanded?: boolean;
    data: TablePersistentData<T>[];
    blankSlate?: TablePersistentBlankSlate;
}

function rowValueForSortColumn<T>(row: T, sortBy: string): unknown {
    return (row as Record<string, unknown>)[sortBy];
}

function normalizeSortableValue(value: unknown): string | number | Date | null {
    if (value == null || value === "") {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === "number") {
        return Number.isNaN(value) ? null : value;
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }
    return String(value);
}

/** Sort rows using `sortAccessor` or, when omitted, `row[sortBy]`; nulls/empty strings last. */
export function tablePersistentAutoSort<T>(
    a: T,
    b: T,
    columns: ITableColumns<T>,
    sortBy: string,
    sortDesc: boolean,
): number {
    if (!sortBy || sortBy === "none") {
        return 0;
    }

    const column = columns[sortBy];
    if (column == null) {
        return 0;
    }

    const rawA = column.sortAccessor != null ? column.sortAccessor(a) : rowValueForSortColumn(a, sortBy);
    const rawB = column.sortAccessor != null ? column.sortAccessor(b) : rowValueForSortColumn(b, sortBy);

    const valA = normalizeSortableValue(rawA);
    const valB = normalizeSortableValue(rawB);

    if (valA == null && valB != null) {
        return 1;
    }
    if (valA != null && valB == null) {
        return -1;
    }
    if (valA == null && valB == null) {
        return 0;
    }

    let result = 0;
    if (valA instanceof Date && valB instanceof Date) {
        result = valA.getTime() - valB.getTime();
    } else if (typeof valA === "number" && typeof valB === "number") {
        result = valA - valB;
    } else {
        result = String(valA).localeCompare(String(valB));
    }

    return sortDesc ? -result : result;
}

interface TablePersistentProps<T> {
    id: string;
    columns: ITableColumns<T>;
    defaultVisibleColumns?: string[];
    sticky?: boolean;
    lazy?: boolean;
    data: T[] | TablePersistentGroupData<T>[];
    children?: (
        visibleColumns: string[],
        columnsOrder: string[],
        sortBy: string,
        sortDesc: boolean
    ) => React.ReactNode | null;
    components?: {
        cell?: React.ComponentType<TablePersistentCellProps<T>>;
        cellCallback?: (props: TablePersistentCellCallbackProps<T>) => void;
        groupChild?: React.ComponentType<TablePersistentSectionProps<T>>;
        groupPrepend?: React.ComponentType<TablePersistentGroupProps>;
        groupAppend?: React.ComponentType<TablePersistentGroupProps>;
        groupCell?: React.ComponentType<TablePersistentSectionCellProps<T>>;
    };
    selected?: string[];
    selectedGroups?: string[];
    draggable?: boolean;
    enableReorder?: boolean;
    onSort?: (A: T, B: T, sortBy: string, sortDesc: boolean) => number;
    onCellClick?: (row: T, column: string, event: React.MouseEvent<HTMLTableCellElement>) => void;
    onSelect?: (row: T) => void;
    onGroupSelect?: (groupId: string) => void;
    onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
}
export function TablePersistent<T>({
    id,
    sticky,
    lazy,
    columns,
    defaultVisibleColumns,
    data,
    children,
    components,
    selected,
    selectedGroups,
    draggable,
    enableReorder,
    onSort,
    onCellClick,
    onSelect,
    onGroupSelect,
    onDragEnd,
}: TablePersistentProps<T>) {
    const storeInstance = TablePersistentStore(id, {
        defaultVisibleColumns: defaultVisibleColumns ?? Object.keys(columns),
        defaultColumnOrder: Object.keys(columns),
        defaultColumnsWidths: {},
    });
    const { visibleColumns, columnWidths, columnsOrder, sortBy, sortDesc } = storeInstance.store.use(state => ({
        visibleColumns: state.visibleColumns,
        columnWidths: state.columnWidths,
        columnsOrder: [
            ...state.columnsOrder,
            ...Object.keys(columns).filter(col => !state.columnsOrder.includes(col)),
        ],
        sortBy: state.sortBy,
        sortDesc: state.sortDesc,
    }), shallowEqual);

    const isDataGrouped = useMemo(() => {
        const item = data.at(0);
        return item != null && "groupId" in (item as TablePersistentGroupData<T>);
    }, [data]);

    const rows = useMemo(() => {
        const compareRows = (A: T, B: T) =>
            onSort != null
                ? onSort(A, B, sortBy, sortDesc)
                : tablePersistentAutoSort(A, B, columns, sortBy, sortDesc);

        const shouldSort =
            onSort != null ||
            (Boolean(sortBy) && sortBy !== "none" && columns[sortBy]?.isSortable === true);

        if (!shouldSort) {
            return data;
        }

        if (isDataGrouped) {
            return (data as TablePersistentGroupData<T>[]).map(group => ({
                ...group,
                data: [...group.data].sort(compareRows),
            }));
        }

        return [...(data as T[])].sort(compareRows);
    }, [columns, data, isDataGrouped, onSort, sortBy, sortDesc]);

    const handleSort = (name: string, desc: boolean) => {
        storeInstance.setSorting(name, desc);
    };

    const handleClearSort = () => {
        storeInstance.clearSorting();
    };

    const handleColumnsChange = (visibility: string[], order: string[]) => {
        storeInstance.setColumns(visibility, order);
    };

    const handleResizeColumn = (column: string, width: number) => {
        storeInstance.setColumnWidths(column, width);
    };

    const canReorder = enableReorder !== false;
    const orderedColumns = canReorder ? objectOrder(columns, columnsOrder, true) : columns;
    const visibleColumnsToRender = canReorder ? columnsOrder.filter(col => visibleColumns.includes(col)) : Object.keys(columns);

    return (
        <DragDropContext onDragEnd={onDragEnd ? onDragEnd : noop}>
            <Table sticky={sticky}>
                <TableHead>
                    {Object.keys(orderedColumns)
                        .filter(col => visibleColumnsToRender.includes(col))
                        .map((col: string) => {
                            const column = columns[col];
                            return (
                                <TableHeaderCell
                                    key={col}
                                    name={col}
                                    title={column.title}
                                    sortable={Boolean(column.isSortable)}
                                    sorting={sortBy === col}
                                    desc={sortDesc}
                                    width={columnWidths[col] ?? column.width}
                                    maxWidth={column.maxWidth}
                                    minWidth={column.minWidth}
                                    resizable={column.resizable}
                                    help={column.help}
                                    onSort={handleSort}
                                    onSortClear={handleClearSort}
                                    onResize={handleResizeColumn}
                                />
                            );
                        })
                    }

                    <TableHeaderCell name="resize" />

                    {canReorder && (
                        <TableColumnPicker<T>
                            columns={columns}
                            visibleColumns={visibleColumns}
                            order={columnsOrder}
                            onChange={handleColumnsChange}
                        />
                    )}
                </TableHead>

                {children != null ? children(visibleColumns, columnsOrder, sortBy, sortDesc) : null}

                {children == null ? (
                    <>
                        {isDataGrouped ? (
                            <TableGroupRenderer
                                tableId={id}
                                groups={rows as TablePersistentGroupData<T>[]}
                                columns={columns}
                                visibleColumns={visibleColumnsToRender}
                                lazy={lazy}
                                cellComponent={components?.cell}
                                cellCallback={components?.cellCallback}
                                groupChildComponent={components?.groupChild}
                                groupPrependComponent={components?.groupPrepend}
                                groupAppendComponent={components?.groupAppend}
                                groupCellComponent={components?.groupCell}
                                draggable={draggable}
                                canReorder={canReorder}
                                selected={selected}
                                onClick={onCellClick}
                                onSelect={onSelect}
                                selectedGroups={selectedGroups}
                                onGroupSelect={onGroupSelect}
                            />
                        ) : (
                            <TableContentRenderer
                                tableId={id}
                                rows={rows as TablePersistentData<T>[]}
                                columns={columns}
                                visibleColumns={visibleColumnsToRender}
                                lazy={lazy}
                                cellComponent={components?.cell}
                                cellCallback={components?.cellCallback}
                                selected={selected}
                                draggable={draggable}
                                canReorder={canReorder}
                                onClick={onCellClick}
                                onSelect={onSelect}
                            />
                        )}
                    </>
                ) : null}
            </Table>
        </DragDropContext>
    );
}

interface TableContentRendererProps<T> {
    tableId: string;
    groupId?: string;
    rows: TablePersistentData<T>[];
    columns: ITableColumns<T>;
    visibleColumns: string[];
    lazy?: boolean;
    cellComponent?: React.ComponentType<TablePersistentCellProps<T>>;
    cellCallback?: (callbackProps: TablePersistentCellCallbackProps<T>) => void;
    selected?: string[];
    draggable?: boolean;
    canReorder: boolean;
    onClick?: (row: T, column: string, event: React.MouseEvent<HTMLTableCellElement>) => void;
    onSelect?: (row: T) => void;
}
function TableContentRenderer<T>({
    groupId,
    rows,
    ...props
}: TableContentRendererProps<T>) {
    // Flatten rows to a single list for a single Droppable
    const flatRows = React.useMemo(() => flattenTree(rows), [rows]);

    return (
        <TableBody id={groupId} droppable>
            {flatRows.map((item: FlattenedItem<T>, i: number) => (
                <TableRowFlat
                    key={item.id}
                    row={item.data}
                    index={i}
                    level={item.level}
                    parentId={item.parentId}
                    isLast={item.isLast}
                    {...props}
                />
            ))}
        </TableBody>
    );
}

interface TableRowFlatProps<T> {
    row: TablePersistentData<T>;
    index: number;
    parentId?: string;
    tableId: string;
    columns: ITableColumns<T>;
    visibleColumns: string[];
    lazy?: boolean;
    cellComponent?: React.ComponentType<TablePersistentCellProps<T>>;
    cellCallback?: (callbackProps: TablePersistentCellCallbackProps<T>) => void;
    selected?: string[];
    draggable?: boolean;
    canReorder?: boolean;
    isLast: boolean;
    level: number;
    onClick?: (row: T, column: string, event: React.MouseEvent<HTMLTableCellElement>) => void;
    onSelect?: (row: T) => void;
}
function TableRowFlat<T>(props: TableRowFlatProps<T>) {
    const {
        row,
        index,
        parentId,
        tableId,
        columns,
        visibleColumns,
        cellComponent,
        cellCallback,
        selected,
        draggable,
        canReorder,
        isLast,
        level,
        onClick,
        onSelect,
    } = props;

    return (
        <Draggable draggableId={row.id} index={index} isDragDisabled={!Boolean(draggable)}>
            {(provided, snapshot) => (
                <Lazy
                    rootElement="tr"
                    loadingElement={
                        <TableRowPlaceholder provided={provided} cols={visibleColumns.length + (canReorder ? 1 : 0)} />
                    }
                    ref={provided.innerRef}
                    className={classNames(`table-row row-level-${level}`, {
                        "is-dragging": snapshot.isDragging,
                        "is-draggable": draggable,
                    })}
                    data-source-index={index}
                    data-parent={parentId}
                    stayRendered
                    {...provided.draggableProps}
                >
                    {visibleColumns.map((col: string, colIndex: number) => {
                        const column = columns[col];

                        if (!column) {
                            return null;
                        }

                        let content: React.ReactNode | string = row[col as keyof T] as string;

                        if (cellComponent != null) {
                            const CellRendered = cellComponent;
                            content = (
                                <CellRendered
                                    tableId={tableId}
                                    row={row}
                                    column={col}
                                    callback={cellCallback ? () => cellCallback({ tableId, row, column: col }) : undefined}
                                />
                            );
                        }

                        return (
                            <TableBodyCell
                                className={classNames(`cell-${col} col-index-${colIndex}`)}
                                key={`${index}-${col}`}
                                onClick={
                                    column.clickable && onClick
                                        ? (event: React.MouseEvent<HTMLTableCellElement>) => onClick(row, col, event)
                                        : undefined
                                }
                                hasCheckbox={onSelect != null && !colIndex}
                                onCheck={onSelect ? () => onSelect(row) : undefined}
                                isChecked={selected?.includes(row.id)}
                                dragHandle={draggable && colIndex === 0 ? (
                                    <span
                                        className="table-row-drag-handle"
                                        {...provided.dragHandleProps}
                                    >
                                        <Icon icon="drag" size={14} />
                                    </span>
                                ) : undefined}
                                paddingLeft={colIndex === 0 ? 30 * level : 0}
                                levelIndicator={colIndex === 0 ? (
                                    <TableLevelIndicator
                                        level={level}
                                        isLast={isLast}
                                        isParent={Boolean(row.children && row.children.length > 0)}
                                    />) : undefined
                                }
                            >
                                <ContentRenderer content={content} />
                            </TableBodyCell>
                        );
                    })}
                    <TableBodyCell />
                    {canReorder && <TableBodyCell className="menu-cell">&nbsp;</TableBodyCell>}
                </Lazy>
            )}
        </Draggable>
    );
}

const ContentRenderer = ({ content }: { content: unknown }) => {
    if (!content) {
        return <>-</>;
    }

    if (content instanceof Date) {
        return <>{formatDate(content)}</>
    }

    if (typeof content === "object") {
        return <>{content as React.ReactNode}</>
    }

    return <>{content.toString()}</>;
}

interface TableGroupRendererProps<T> {
    tableId: string;
    groups: TablePersistentGroupData<T>[];
    columns: ITableColumns<T>;
    visibleColumns: string[];
    lazy?: boolean;
    selected?: string[];
    selectedGroups?: string[];
    cellComponent?: React.ComponentType<TablePersistentCellProps<T>>;
    cellCallback?: (callbackProps: TablePersistentCellCallbackProps<T>) => void;
    groupChildComponent?: React.ComponentType<TablePersistentSectionProps<T>>;
    groupAppendComponent?: React.ComponentType<TablePersistentGroupProps>;
    groupPrependComponent?: React.ComponentType<TablePersistentGroupProps>;
    groupCellComponent?: React.ComponentType<TablePersistentSectionCellProps<T>>;
    draggable?: boolean;
    canReorder: boolean;
    onClick?: (row: T, column: string, event: React.MouseEvent<HTMLTableCellElement>) => void;
    onSelect?: (row: T) => void;
    onGroupSelect?: (groupId: string) => void;
}

function TableGroupRenderer<T>({
    tableId,
    groups,
    columns,
    visibleColumns,
    lazy,
    selected,
    selectedGroups,
    cellComponent,
    cellCallback,
    groupChildComponent,
    groupAppendComponent,
    groupPrependComponent,
    groupCellComponent,
    draggable,
    canReorder,
    onClick,
    onSelect,
    onGroupSelect,
}: TableGroupRendererProps<T>) {
    const [visibleGroups, setVisibleGroups] = useStorage<string[]>(
        `table-${tableId}-visible-groups`,
        true,
        []
    );

    const handleToggleGroup = (groupId: string) => {
        if (!visibleGroups.some(g => g.startsWith(groupId))) {
            const group = groups.find(g => g.groupId === groupId);
            setVisibleGroups([...visibleGroups, `${groupId}:${group?.defaultExpanded ? "off" : "on"}`]);
        } else {
            setVisibleGroups(
                visibleGroups.map((visibleGroup: string) => {
                    if (visibleGroup.startsWith(groupId)) {
                        return visibleGroup.endsWith(":on") ? `${groupId}:off` : `${groupId}:on`;
                    }
                    return visibleGroup;
                })
            );
        }
    };

    const handleSelectGroup = (groupId: string) => {
        if (onGroupSelect == null) return;

        onGroupSelect(groupId);
    };

    const GroupChildComponent = groupChildComponent;
    const GroupPrependComponent = groupPrependComponent;
    const GroupAppendComponent = groupAppendComponent;
    const GroupCellComponent = groupCellComponent;

    return (
        <>
            {groups.map((group: TablePersistentGroupData<T>) => {
                const isGroupVisible = visibleGroups.some(g => g.startsWith(group.groupId))
                    ? visibleGroups.find(g => g.startsWith(group.groupId))?.endsWith(":on")
                    : Boolean(group.defaultExpanded);

                return (
                    <React.Fragment key={group.groupId}>
                        <TableSection
                            span={visibleColumns.length + (canReorder ? 2 : 1)}
                            title={group.title}
                            isOpen={isGroupVisible}
                            append={
                                GroupAppendComponent != null ? (
                                    <GroupAppendComponent
                                        groupId={group.groupId}
                                        title={group.title}
                                        count={group.data.length}
                                    />
                                ) : undefined
                            }
                            prepend={
                                GroupPrependComponent != null ? (
                                    <GroupPrependComponent
                                        groupId={group.groupId}
                                        title={group.title}
                                        count={group.data.length}
                                    />
                                ) : undefined
                            }
                            cells={GroupCellComponent != null ? (
                                <>
                                    {Object.keys(columns).slice(1).map((column) => (
                                        <TableSectionCell key={column}>
                                            <GroupCellComponent
                                                column={column}
                                                title={columns[column].title}
                                                section={group}
                                            />
                                        </TableSectionCell>
                                    ))}
                                    <TableSectionCell>
                                    </TableSectionCell>
                                </>
                            ) : undefined}
                            isChecked={selectedGroups?.includes(group.groupId)}
                            onToggle={() => handleToggleGroup(group.groupId)}
                            onCheck={onGroupSelect ? () => handleSelectGroup(group.groupId) : undefined}
                        >
                            {GroupChildComponent != null ? (
                                <GroupChildComponent
                                    group={group}
                                    columns={Object.keys(columns).length}
                                    isOpen={isGroupVisible}
                                    onToggle={() => handleToggleGroup(group.groupId)}
                                />
                            ) : null}
                        </TableSection>

                        {isGroupVisible && group.data.length ? (
                            <TableContentRenderer
                                tableId={tableId}
                                groupId={group.groupId}
                                rows={group.data}
                                columns={columns}
                                visibleColumns={visibleColumns}
                                lazy={lazy}
                                cellComponent={cellComponent}
                                cellCallback={cellCallback}
                                draggable={draggable}
                                canReorder={canReorder}
                                onClick={onClick}
                                onSelect={onSelect}
                                selected={selected}
                            />
                        ) : isGroupVisible && group.blankSlate ? (
                            <TableBody id={group.groupId} droppable>
                                <tr>
                                    <TableBodyCell align="center">
                                        <BlankSlate
                                            icon={group.blankSlate.icon}
                                            title={group.blankSlate.title}
                                            description={group.blankSlate.description}
                                        />
                                    </TableBodyCell>
                                    <TableBodyCell span={visibleColumns.length}></TableBodyCell>
                                    {canReorder && <TableBodyCell className="menu-cell">&nbsp;</TableBodyCell>}
                                </tr>
                            </TableBody>
                        ) : null}
                    </React.Fragment>
                );
            })}
        </>
    );
}
