// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes } from "@blueprintjs/core";
import { DraggableProvided } from "@hello-pangea/dnd";
import React from "react";
import { FunctionComponent } from "react";


interface ITableRowPlaceholderProps {
    cols: number;
    provided: DraggableProvided;
}
const TableRowPlaceholderPure: FunctionComponent<ITableRowPlaceholderProps> = ({ cols, provided }) => {
    return (
        <td colSpan={cols}>
            <div className="table-body-cell" {...provided.dragHandleProps}>
                <div className={Classes.SKELETON} style={{ height: 24, width: "100%" }}></div>
            </div>
        </td>
    );
};

export const TableRowPlaceholder = React.memo(TableRowPlaceholderPure);