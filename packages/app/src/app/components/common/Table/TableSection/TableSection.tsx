// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Checkbox, Classes } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useCallback } from "react";

import { Icon } from "../../Icon/Icon";

interface ITableHeadProps {
    title?: string;
    span: number;
    isOpen?: boolean;
    prepend?: React.ReactNode;
    append?: React.ReactNode;
    children?: React.ReactNode;
    isChecked?: boolean;
    rightElement?: React.ReactNode;
    cells?: React.ReactNode | React.ReactNode[];
    onToggle?: () => void;
    onCheck?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
export const TableSection: FunctionComponent<ITableHeadProps> = ({
    title,
    span,
    isOpen,
    prepend,
    append,
    children,
    isChecked,
    rightElement,
    cells,
    onToggle,
    onCheck,
}) => {
    const setSectionRef = useCallback((element: HTMLTableSectionElement | null) => {
        if (element) {
            const parentTable = element.closest("table");
            if (parentTable) {
                const tableHead = parentTable.querySelector("thead");
                if (tableHead) {
                    element.style.top = `${tableHead.offsetHeight - 33}px`;
                }
            }
        }
    }, []);

    const handleCheck = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (onCheck) onCheck(event);
    };

    const handleToggleSection = () => {
        if (onToggle) onToggle();
    };

    return (
        <tbody className={classNames("table-section", { closed: !isOpen })} ref={setSectionRef}>
            <tr>
                {children}
                {children == null && (
                    <>
                        <TableSectionCell hasCheckbox={onCheck != null}>
                            {onCheck != null ? (
                                <Checkbox type="checkbox" checked={isChecked} onChange={handleCheck} />
                            ) : null}

                            {Boolean(onToggle) ? (
                                <Button
                                    icon={<Icon icon={isOpen ? "chevron-down" : "chevron-right"} />}
                                    variant="minimal"
                                    size="small"
                                    onClick={handleToggleSection}
                                />
                            ) : null}

                            {prepend}
                            <h4
                                className={classNames("interractive", Classes.HEADING)}
                                onClick={handleToggleSection}
                            >
                                {title}
                            </h4>
                            {append}
                        </TableSectionCell>

                        {cells}

                        {cells == null && (<TableSectionCell span={span - 1}>
                            {rightElement}
                        </TableSectionCell>)}
                    </>
                )}
            </tr>
        </tbody>
    );
};

interface TableSectionCellProps {
    children?: React.ReactNode;
    hasCheckbox?: boolean;
    span?: number;
}
export const TableSectionCell: FunctionComponent<TableSectionCellProps> = ({ children, hasCheckbox, span }) => {
    return (
        <td colSpan={span}>
            <div className={classNames("table-section__cell", { "has-checkbox": hasCheckbox })}>{children}</div>
        </td>
    )
}