// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Dialog } from "@blueprintjs/core";
import { DragDropContext, Draggable, DropResult, Droppable } from "@hello-pangea/dnd";
import React, { FunctionComponent, useState } from "react";

import { Icon, Scroller } from "app/components/common";
import { ITag } from "@stacks/types";
import classNames from "classnames";

interface ITagsOrderDialogProps {
    items: ITag[];
    onClose: () => void;
    onReorder: (tags: string[]) => void;
}

export const TagsOrderDialog: FunctionComponent<ITagsOrderDialogProps> = ({ items, onClose, onReorder }) => {
    const [open, setOpen] = useState(true);

    return (
        <Dialog isOpen={open} title="Reorder" onClose={() => setOpen(false)} onClosed={onClose}>
            <DragDropContext onDragEnd={handleDrop}>
                <Scroller thin vertical maxHeight="90vh">
                    <div className={Classes.DIALOG_BODY}>
                        <Droppable droppableId="droppable">
                            {provided => (
                                <ul
                                    className={Classes.MENU}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {items.map((item, index) => (
                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                            {provided => (
                                                <li ref={provided.innerRef} {...provided.draggableProps}>
                                                    <div className={Classes.MENU_ITEM}>
                                                        <span className={Classes.MENU_ITEM_ICON}>
                                                            <Icon icon="circle-filled" color={item.color} />
                                                        </span>
                                                        <div
                                                            className={classNames(
                                                                Classes.TEXT_OVERFLOW_ELLIPSIS,
                                                                Classes.FILL
                                                            )}
                                                        >
                                                            {item.title}
                                                        </div>
                                                        <span
                                                            className={Classes.MENU_ITEM_LABEL}
                                                            {...provided.dragHandleProps}
                                                        >
                                                            <Icon icon="drag" />
                                                        </span>
                                                    </div>
                                                </li>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </ul>
                            )}
                        </Droppable>
                    </div>
                </Scroller>
            </DragDropContext>
        </Dialog>
    );

    function handleDrop(result: DropResult) {
        if (!result.destination) return;
        if (result.destination.index === result.source.index) return;

        const tagsIds = items.map(item => item.id);
        const movedTagId = tagsIds.splice(result.source.index, 1).at(0);
        if (!movedTagId) return;
        tagsIds.splice(result.destination.index, 0, movedTagId);
        onReorder(tagsIds);
    }
};
