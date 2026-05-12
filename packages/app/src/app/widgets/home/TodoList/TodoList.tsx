// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Card,
    Classes,
    InputGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Tooltip,
} from "@blueprintjs/core";
import { DragDropContext, Draggable, DraggableProvided, DropResult, Droppable } from "@hello-pangea/dnd";
import { translate } from "@stacks/translations";
import { taskToggleDoneLabel } from "app/locale/dynamic-messages";
import classNames from "classnames";

import { shallowEqual } from "app/hooks/store";
import { HomeActions } from "app/store/actions";
import { HomeStore, IHomeTodoItem } from "app/store/home";
import { formatDate } from "app/utils/date";
import { LocaleDatePicker } from "app/widgets/common";
import React, { FunctionComponent, useMemo, useState } from "react";
import {
    BlankSlate,
    DatePickerButton,
    Grid,
    HotkeyChip,
    Icon,
    RoundButton,
} from "../../../components/common";

export const TodoList: FunctionComponent = () => {
    const { todoList, sorting } = HomeStore.use(
        state => ({
            todoList: state.todos,
            sorting: state.todoSorting,
        }),
        shallowEqual
    );
    const [text, setText] = useState("");
    const [date, setDate] = useState<Date | null>(null);

    const sortedTodos = useMemo(() => {
        if (sorting === "manual") return todoList;

        return [...todoList].sort((a, b) => {
            if (!a.date && b.date) return 1;
            if (a.date && !b.date) return -1;
            const dateA = a.date;
            const dateB = b.date;
            if (!dateA || !dateB) return 0;
            return sorting === "date-asc"
                ? dateA.getTime() - dateB.getTime()
                : dateB.getTime() - dateA.getTime();
        });
    }, [todoList, sorting]);

    const completeCount = useMemo(() => {
        return todoList.filter((todo: IHomeTodoItem) => todo.completed).length;
    }, [todoList]);

    const handleChangeSorting = (sortingType: string) => {
        if (sortingType === sorting) return;
        HomeActions.setTodoSorting(sortingType);
    };

    const addItem = () => {
        HomeActions.addTodo(text, date);
    };

    const handleSetText = (event: React.ChangeEvent<HTMLInputElement>) => {
        setText(event.currentTarget.value);
    };

    const handleDateChange = (selectedDate: Date | null, isUserChange: boolean) => {
        if (!isUserChange) return;
        setDate(selectedDate);
    };

    const handleItemDateChange = (selectedDate: Date, index: number) => {
        HomeActions.setTodoDate(index, selectedDate);
    };

    const handleDatePickerOpened = () => {
        if (date == null) {
            setDate(new Date());
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.keyCode === 13) {
            addItem();
        }

        if (event.keyCode === 13 || event.keyCode === 27) {
            setText("");
            setDate(null);
        }
    };

    const handleOrderManully = (result: DropResult) => {
        if (!result.destination || result.source.index === result.destination?.index) return;
        const movedTodo = { ...todoList[result.source.index] };
        const otherTodos = todoList.filter(todo => todo.id !== result.draggableId);
        otherTodos.splice(result.destination.index, 0, movedTodo);
        HomeActions.setManuallySortedTodos(otherTodos);
    };

    const blankSlate = useMemo(() => {
        if (todoList.length > 0) return null;
        return (
            <div className="todo-list__blank">
                <BlankSlate
                    icon="check-circle"
                    title={translate("No todos")}
                    description={
                        <div>
                            You don&apos;t have any to do&apos;s yet.
                            <br />
                            Enter a text bellow and hit <HotkeyChip keys={["Enter"]} /> to add your first one.
                        </div>
                    }
                />
            </div>
        );
    }, [todoList]);

    return (
        <Grid gap={0} className="todo-list">
            <h5 className={classNames("todo-list__header home-title", Classes.HEADING)}>
                <span>
                    {translate("Todos")}{" "}
                    {completeCount > 0 && (
                        <>
                            ({completeCount}/{todoList.length})
                        </>
                    )}
                    &nbsp;
                    {completeCount > 0 && (
                        <Tooltip content="Clear completed tasks" placement="top">
                            <a onClick={HomeActions.clearCompletedTodos}>
                                <small>Clear</small>
                            </a>
                        </Tooltip>
                    )}
                </span>

                <Popover
                    content={
                        <Menu>
                            <MenuItem
                                text="Sort by date Asc"
                                icon="sort-numerical"
                                labelElement={sorting === "date-asc" ? <Icon icon="check" /> : null}
                                onClick={() => handleChangeSorting("date-asc")}
                            />
                            <MenuItem
                                text="Sort by date Desc"
                                icon="sort-numerical-desc"
                                labelElement={sorting === "date-desc" ? <Icon icon="check" /> : null}
                                onClick={() => handleChangeSorting("date-desc")}
                            />
                            <MenuDivider />
                            <MenuItem
                                text="Manual sorting"
                                icon="hand"
                                labelElement={sorting === "manual" ? <Icon icon="check" /> : null}
                                onClick={() => handleChangeSorting("manual")}
                            />
                        </Menu>
                    }
                >
                    <Button
                        icon={
                            sorting !== "manual" ? (
                                <Icon icon={sorting === "date-asc" ? "arrow-up" : "arrow-down"} size={12} />
                            ) : null
                        }
                        small
                        minimal
                        rightIcon={<Icon icon="chevron-down" />}
                    >
                        {sorting === "manual" ? "Manual" : "Date"}
                    </Button>
                </Popover>
            </h5>
            <Card style={{ height: "100%" }}>
                <Grid gap={20} style={{ height: "100%" }}>
                    {blankSlate}

                    {sortedTodos.length > 0 && (
                        <div>
                            {sorting === "manual" ? (
                                <DragDropContext onDragEnd={handleOrderManully}>
                                    <Droppable droppableId="droppable">
                                        {provided => (
                                            <div {...provided.droppableProps} ref={provided.innerRef}>
                                                {sortedTodos.map((item: IHomeTodoItem, index: number) => {
                                                    return (
                                                        <Draggable
                                                            key={item.id}
                                                            draggableId={item.id}
                                                            index={index}
                                                            isDragDisabled={sorting !== "manual"}
                                                        >
                                                            {(provided, snapshot) => (
                                                                <TodoItem
                                                                    item={item}
                                                                    isDragging={snapshot.isDragging}
                                                                    isDraggable={sorting === "manual"}
                                                                    provided={provided}
                                                                    onToggleComplete={() =>
                                                                        HomeActions.toggleTodo(index)
                                                                    }
                                                                    onDateChange={date =>
                                                                        date &&
                                                                        handleItemDateChange(date, index)
                                                                    }
                                                                    onRemove={() =>
                                                                        HomeActions.removeTodo(index)
                                                                    }
                                                                />
                                                            )}
                                                        </Draggable>
                                                    );
                                                })}

                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            ) : (
                                sortedTodos.map((item: IHomeTodoItem, index: number) => (
                                    <TodoItem
                                        key={item.id}
                                        item={item}
                                        isDraggable={sorting === "manual"}
                                        onToggleComplete={() => HomeActions.toggleTodo(index)}
                                        onDateChange={date => date && handleItemDateChange(date, index)}
                                        onRemove={() => HomeActions.removeTodo(index)}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    <InputGroup
                        value={text}
                        placeholder={translate("Something needs doing")}
                        onChange={handleSetText}
                        onKeyDown={handleKeyDown}
                        fill
                        rightElement={
                            <>
                                <Popover
                                    content={
                                        <LocaleDatePicker
                                            value={date}
                                            onChange={handleDateChange}
                                            showActionsBar
                                        />
                                    }
                                    onOpening={handleDatePickerOpened}
                                    placement="top-end"
                                >
                                    <Button
                                        minimal={date == null}
                                        small
                                        text={formatDate(date)}
                                        icon={<Icon icon="calendar" />}
                                    />
                                </Popover>
                            </>
                        }
                    />
                </Grid>
            </Card>
        </Grid>
    );
};

interface ITodosProps {
    item: IHomeTodoItem;
    isDragging?: boolean;
    isDraggable?: boolean;
    provided?: DraggableProvided;
    onToggleComplete: () => void;
    onDateChange: (selectedDate: Date | null) => void;
    onRemove: () => void;
}
const TodoItem: FunctionComponent<ITodosProps> = ({
    item,
    isDragging,
    isDraggable,
    provided,
    onToggleComplete,
    onDateChange,
    onRemove,
}) => {
    return (
        <div
            className={classNames("todo-list__item", {
                completed: item.completed,
                dragging: isDragging,
                draggable: isDraggable,
            })}
            ref={provided?.innerRef}
            {...provided?.draggableProps}
            {...provided?.dragHandleProps}
        >
            <RoundButton
                dashed
                icon="check"
                tooltip={taskToggleDoneLabel(item.completed)}
                intent={item.completed ? Intent.PRIMARY : Intent.NONE}
                active={item.completed}
                onClick={onToggleComplete}
            />

            <Grid gap={5}>
                <div className={Classes.UI_TEXT}>{item.title}</div>
                {item.date && (
                    <div>
                        <DatePickerButton
                            value={item.date ?? null}
                            onChange={onDateChange}
                            popoverProps={{
                                placement: "top-end",
                            }}
                        />
                    </div>
                )}
            </Grid>

            <Button
                small
                minimal
                intent={Intent.DANGER}
                onClick={onRemove}
                icon={<Icon icon="trash" size={14} />}
            />
        </div>
    );
};
