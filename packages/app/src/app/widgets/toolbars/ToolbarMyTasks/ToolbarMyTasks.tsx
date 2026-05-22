// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { format, isToday, isWithinInterval } from "date-fns";
import mousetrap from "mousetrap";
import React, { useEffect, useMemo } from "react";
import { Button, ButtonGroup, H4, Intent, Menu, MenuDivider, MenuItem, Popover, Tooltip } from "@blueprintjs/core";
import { TIMEBOXVIEWS } from "@stacks/types";
import { Icon, ReloadButton, ToolbarButton } from "app/components/common";
import { useHasFilters } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { MyTasksActions, ProjectFiltersActions, TasksActions } from "app/store/actions";
import { toggleNewTask } from "app/store/global";
import { MyTasksStore } from "app/store/myTasks";
import classNames from "classnames";
import { ProjectSearch } from "../ToolbarProject/ToolbarProject";

export const ToolbarMyTasks = () => {
    const view = MyTasksStore.use(state => state.view, shallowEqual);

    useEffect(() => {
        // open filter
        mousetrap.bind("meta+n", toggleNewTask);
        mousetrap.bind("left", MyTasksActions.prevSpan);
        mousetrap.bind("right", MyTasksActions.nextSpan);
        mousetrap.bind("up", MyTasksActions.today);
        mousetrap.bind("ctrl+1", () => MyTasksActions.setView("list"));
        mousetrap.bind("ctrl+2", () => MyTasksActions.setView("schedule"));

        return () => {
            mousetrap.unbind("meta+n");
            mousetrap.unbind("left");
            mousetrap.unbind("right");
            mousetrap.unbind("up");
            mousetrap.unbind("ctrl+1");
            mousetrap.unbind("ctrl+2");
        };
    }, []);

    return (
        <div className="main-toolbar">
            <div className="section-toolbar">
                <div className="section-toolbar-side side">
                    <div className="section-toolbar-title">
                        <h1>
                            {translate("My tasks")}
                        </h1>
                    </div>
                </div>
                <div className="section-toolbar-side fixed">
                    <TimeboxDate />

                    <ProjectSearch />

                    <span className="section-toolbar-divider" />

                    <ReloadButton
                        tooltip={translate("Reload my tasks")}
                        placement="bottom-end"
                        onClick={() => TasksActions.loadMy()}
                    />

                    <ToolbarButton
                        icon="plus"
                        title={translate("Add task")}
                        placement="bottom-end"
                        active
                        minimal={false}
                        onClick={toggleNewTask}
                    />
                </div>
            </div>
            <div className="section-toolbar">
                <div className="section-toolbar-side">
                    <button
                        className={classNames("view-type-button", { active: view === "list" })}
                        onClick={() => MyTasksActions.setView("list")}
                    >
                        <Icon icon="list" />
                        List
                    </button>
                    <button
                        className={classNames("view-type-button", { active: view === "schedule" })}
                        onClick={() => MyTasksActions.setView("schedule")}
                    >
                        <Icon icon="calendar-check-01" />
                        Schedule
                    </button>

                </div>
                <div className="section-toolbar-side">
                    <TimeboxViewButton />
                    <FilterButton />
                </div>
            </div>
        </div>
    );
};

const FilterButton = () => {
    const hasFilters = useHasFilters();

    useEffect(() => {
        // open filter
        mousetrap.bind(["ctrl+f", "command+f"], handleToggleFilter);

        return () => {
            mousetrap.unbind(["ctrl+f", "command+f"]);
        };
    }, []);

    const handleToggleFilter = () => {
        ProjectFiltersActions.toggleShow("mytasks");
    };

    return (
        <>
            {hasFilters ? (
                <Button
                    variant="minimal"
                    size="small"
                    icon={<Icon icon="trash" />}
                    intent={Intent.WARNING}
                    onClick={ProjectFiltersActions.reset}
                >
                    {translate("Clear filters")}
                </Button>
            ) : null}

            <ToolbarButton
                icon={Boolean(hasFilters) ? "filter-filled" : "filter"}
                title={translate("Filters")}
                tooltip={translate("Filter project")}
                badge={Boolean(hasFilters)}
                keys={["meta", "F"]}
                placement="bottom-end"
                onClick={handleToggleFilter}
            // active={isActive}
            />
        </>
    );
};

const BTN_LABELS = {
    [TIMEBOXVIEWS.BOARD]: {
        label: "Board",
        icon: "board-view",
    },
    [TIMEBOXVIEWS.CALENDAR]: {
        label: "Calendar",
        icon: "calendar-check-01",
    },
}

const TimeboxViewButton = () => {
    const { view, scheduledView, calendarView } = MyTasksStore.use(state => ({
        view: state.view,
        scheduledView: state.scheduleView,
        calendarView: state.calendarView
    }), shallowEqual);
    if (view === "list") return null;

    const isBoardView = scheduledView === TIMEBOXVIEWS.BOARD;
    const isCalendarView = scheduledView === TIMEBOXVIEWS.CALENDAR;

    return (
        <>
            <Popover
                content={
                    <Menu>
                        <MenuDivider title="Views" />
                        <MenuItem
                            text="Board"
                            icon={<Icon icon="board-view" />}
                            labelElement={isBoardView ? <Icon icon="check" /> : null}
                            onClick={() => MyTasksActions.setScheduleView(TIMEBOXVIEWS.BOARD)}
                        />
                        <MenuDivider title="Calendar" />
                        <MenuItem
                            text="One day"
                            icon={<Icon icon="rows-03" />}
                            labelElement={isCalendarView && calendarView === "one" ? <Icon icon="check" /> : null}
                            onClick={() => MyTasksActions.setCalendarView("one")}
                        />

                        <MenuItem
                            text="Three days"
                            icon={<Icon icon="columns-03" />}
                            labelElement={isCalendarView && calendarView === "three" ? <Icon icon="check" /> : null}
                            onClick={() => MyTasksActions.setCalendarView("three")}
                        />
                        <MenuItem
                            text="Weekdays"
                            icon={<Icon icon="columns-03" />}
                            labelElement={isCalendarView && calendarView === "weekdays" ? <Icon icon="check" /> : null}
                            onClick={() => MyTasksActions.setCalendarView("weekdays")}
                        />
                        <MenuItem
                            text="Full week"
                            icon={<Icon icon="columns-03" />}
                            labelElement={isCalendarView && calendarView === "week" ? <Icon icon="check" /> : null}
                            onClick={() => MyTasksActions.setCalendarView("week")}
                        />
                        <MenuItem
                            text="Month"
                            icon={<Icon icon="layout-grid-01" />}
                            labelElement={isCalendarView && calendarView === "month" ? <Icon icon="check" /> : null}
                            onClick={() => MyTasksActions.setCalendarView("month")}
                        />
                    </Menu>
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ...props }) => (
                    <Button {...props}
                        icon={<Icon icon={BTN_LABELS[scheduledView].icon} />}
                        size="small"
                        variant="minimal"
                        rightIcon={<Icon icon="chevron-down" />}
                    >
                        {BTN_LABELS[scheduledView].label}
                    </Button>
                )}
            />
            <span className="section-toolbar-divider" />
        </>
    )
}

const TimeboxDate = () => {
    const { start, end, view, calendarView, scheduledView } = MyTasksStore.use(state => ({
        start: state.start,
        end: state.end,
        view: state.view,
        calendarView: state.calendarView,
        scheduledView: state.scheduleView,
    }), shallowEqual);

    const dateLabel = useMemo(() => {
        if (scheduledView === TIMEBOXVIEWS.BOARD || (scheduledView === TIMEBOXVIEWS.CALENDAR && calendarView === "three")) {
            return `${format(start, "PP")}${end ? ` - ${format(end, "PP")}` : ""}`
        }

        if (calendarView === "month") {
            return format(start, "MMMM yyyy");
        } else if (calendarView === "one") {
            return format(start, "PP");
        }

        return `Week ${format(start, "w, MMM yyyy")}`;
    }, [start, calendarView, scheduledView]);

    const shouldShowTodayButton = useMemo(() => {
        if (scheduledView === TIMEBOXVIEWS.CALENDAR && calendarView === "one") {
            return !isToday(start);
        }

        return !isWithinInterval(new Date(), {
            start,
            end
        })
    }, [scheduledView, calendarView, start, end]);

    if (view === "list") return null;

    return (
        <>
            <H4 style={{ margin: 0 }}>
                {dateLabel}
            </H4>

            {shouldShowTodayButton && (
                <Tooltip content={translate("Go to Today")} placement="bottom" hoverOpenDelay={500}>
                    <Button
                        size="small"
                        variant="minimal"
                        intent={Intent.PRIMARY}
                        icon={<Icon icon="calendar-date" />}
                        onClick={MyTasksActions.today}
                    >
                        {translate("Today")}
                    </Button>
                </Tooltip>
            )}

            <ButtonGroup>
                <Tooltip
                    content={translate("Jump to previous day")}
                    placement="bottom"
                    hoverOpenDelay={500}
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <Button
                            {...props}
                            icon={<Icon icon="chevron-left" />}
                            size="small"
                            variant="minimal"
                            onClick={MyTasksActions.prevSpan}
                        />
                    )}
                />

                <Tooltip
                    content={translate("Jump to next day")}
                    placement="bottom"
                    hoverOpenDelay={500}
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <Button
                            {...props}
                            icon={<Icon icon="chevron-right" />}
                            size="small"
                            variant="minimal"
                            onClick={MyTasksActions.nextSpan}
                        />
                    )}
                />
            </ButtonGroup>

            <span className="section-toolbar-divider" />
        </>
    );
}
