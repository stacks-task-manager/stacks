// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, ButtonGroup, H4, Intent, Menu, MenuItem, Popover, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import { format, getWeek } from "date-fns";
import mousetrap from "mousetrap";
import React, { useEffect, useMemo, useRef } from "react";

import { Icon, ReloadButton, ToolbarButton } from "app/components/common";
import { shallowEqual } from "app/hooks/store";
import { CalendarActions } from "app/store/actions";
import { CalendarStore } from "app/store/calendar";
import { formatDate } from "app/utils/date";
import { LocaleDatePicker } from "app/widgets/common";
export const ToolbarCalendar = () => {
    const { date, view } = CalendarStore.use();
    const filterButtonRef = useRef<HTMLButtonElement | null>(null);

    const handleForceOpenFilter = () => {
        if (filterButtonRef.current) {
            filterButtonRef.current.click();
        }
    };

    useEffect(() => {
        // mousetrap.bind("meta+n", handleAddNewEvent);
        mousetrap.bind("meta+f", handleForceOpenFilter);

        return () => {
            // mousetrap.unbind("meta+n");
            mousetrap.unbind("meta+f");
        };
    }, []);

    const currentDate = useMemo(() => {
        if (view === "month") return formatDate(date, "LLLL y");
        if (view === "week") return `Week ${getWeek(new Date(date))}, ${format(new Date(date), "MMM yyyy")}`;

        return format(new Date(date), "eee, MMM do yyyy");
    }, [view, date]);

    // const handleAddNewEvent = () => {
    //     const start = moment().minute(0).toDate();
    //     const end = moment().add(1, "hours").minute(0).toDate();

    //     CalendarActions.setNewEvent({
    //         title: "New event",
    //         start,
    //         end,
    //         resource: {
    //             data: {
    //                 title: "New event",
    //                 description: "",
    //                 start: start.toJSON(),
    //                 end: end.toJSON(),
    //             },
    //             type: EVENTTYPE.EVENT,
    //         },
    //         allDay: false,
    //     });
    // };

    return (
        <div className="main-toolbar">
            <div className="section-toolbar">
                <div className="section-toolbar-side side">
                    <div className="section-toolbar-title">
                        <h1>{translate("Calendar")}</h1>
                    </div>
                    <div className="section-toolbar-options">
                        <Popover
                            content={
                                <Menu>
                                    <AuthButtons />
                                </Menu>
                            }
                            placement="bottom"
                        >
                            <Button size="small" variant="minimal" icon={<Icon icon="chevron-down" />} />
                        </Popover>
                    </div>
                </div>
                <div className="section-toolbar-side fixed">
                    <H4 style={{ margin: 0 }}>{currentDate}</H4>

                    <span className="section-toolbar-divider" />

                    <Button size="small" onClick={CalendarActions.setToday}>
                        {translate("Today")}
                    </Button>

                    <ButtonGroup>
                        <Button
                            icon={<Icon icon="chevron-left" />}
                            size="small"
                            variant="minimal"
                            onClick={CalendarActions.goPrev}
                        />

                        <Button
                            icon={<Icon icon="chevron-right" />}
                            size="small"
                            variant="minimal"
                            onClick={CalendarActions.goNext}
                        />
                    </ButtonGroup>

                    <span className="section-toolbar-divider" />

                    <ReloadButton
                        tooltip={translate("Reload events")}
                        onClick={() => CalendarActions.reload()}
                    />

                    <Popover
                        placement="bottom"
                        content={
                            <LocaleDatePicker
                                highlightCurrentDay
                                defaultValue={date}
                                onChange={date => date && CalendarActions.setDate(date)}
                            />
                        }
                    >
                        <Tooltip
                            content="Jump to date"
                            placement="bottom-end"
                            hoverOpenDelay={500}
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            renderTarget={({ isOpen, ...props }) => (
                                <Button
                                    {...props}
                                    size="small"
                                    variant="minimal"
                                    icon={<Icon icon="calendar" />}
                                />
                            )}
                        />
                    </Popover>

                    {/* <span className="section-toolbar-divider" /> */}

                    {/* <ToolbarButton
                        icon="plus"
                        title={translate("Add event")}
                        minimal={false}
                        intent={Intent.PRIMARY}
                        placement="bottom-end"
                        onClick={handleAddNewEvent}
                    /> */}
                </div>
            </div>
            <div className="section-toolbar">
                <div className="section-toolbar-side">
                    <button
                        className={classNames("view-type-button", { active: "day" === view })}
                        onClick={() => CalendarActions.setView("day")}
                    >
                        <Icon icon="rows-03" />
                        {translate("Day")}
                    </button>
                    <button
                        className={classNames("view-type-button", { active: "week" === view })}
                        onClick={() => CalendarActions.setView("week")}
                    >
                        <Icon icon="columns-03" />
                        {translate("Week")}
                    </button>
                    <button
                        className={classNames("view-type-button", { active: "month" === view })}
                        onClick={() => CalendarActions.setView("month")}
                    >
                        <Icon icon="layout-grid-01" />
                        {translate("Month")}
                    </button>
                </div>
                <div className="section-toolbar-side">
                    <FilterButton />
                </div>
            </div>
        </div>
    );
};

const FilterButton = () => {
    const showFilters = CalendarStore.use(state => state.showFilters, shallowEqual);

    useEffect(() => {
        mousetrap.bind(["ctrl+f", "command+f"], CalendarActions.toggleFilters);

        return () => {
            mousetrap.unbind(["ctrl+f", "command+f"]);
        };
    }, []);

    return (
        <ToolbarButton
            icon="filter"
            title="Filters"
            tooltip={translate("Filter project")}
            keys={["meta", "F"]}
            placement="bottom-end"
            active={showFilters}
            onClick={CalendarActions.toggleFilters}
        />
    );
};

const AuthButtons = () => {
    const tokens = CalendarStore.use(state => state.tokens, shallowEqual);

    const isGoogleAuthenticated = tokens.google != null;

    const handleLogin = () => {
        CalendarActions.loginGoogle();
    };

    return (
        <MenuItem text="Connect" icon={<Icon icon="calendar-plus-01" />}>
            {isGoogleAuthenticated ? (
                <MenuItem
                    text="Log out from Google"
                    icon={<Icon icon="google" />}
                    intent={Intent.WARNING}
                    onClick={() => CalendarActions.disconnectCalendarProvider("google")}
                />
            ) : (
                <MenuItem text="Log in with Google" icon={<Icon icon="google" />} onClick={handleLogin} />
            )}
        </MenuItem>
    );
};
