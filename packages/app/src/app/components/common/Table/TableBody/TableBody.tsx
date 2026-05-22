// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Droppable } from "@hello-pangea/dnd";
import React, { FunctionComponent } from "react";

interface ITableBodyProps {
    children: React.ReactNode;
    id?: string;
    droppable?: boolean;
}
export const TableBody: FunctionComponent<ITableBodyProps> = ({ children, id, droppable }) => {
    if (!droppable) {
        return <tbody className="table-rows">{children}</tbody>;
    }

    return (
        <Droppable droppableId={id ?? "group"} direction="vertical">
            {provided => (
                <tbody className="table-rows" {...provided.droppableProps} ref={provided.innerRef}>
                    {children}
                    {provided.placeholder}
                </tbody>
            )}
        </Droppable>
    );
};
