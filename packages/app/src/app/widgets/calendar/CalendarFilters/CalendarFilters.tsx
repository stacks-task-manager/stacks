// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Checkbox, Classes, FormGroup, InputGroup, Menu, MenuItem, Popover } from "@blueprintjs/core";
import React, { useState } from "react";
import { ICalendar } from "@stacks/types";
import { Col, Icon, Row } from "app/components/common";
import { useCalendars, useCalendarsFilters } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { CalendarActions } from "app/store/actions";
import { CalendarStore } from "app/store/calendar";
import { showPermissions } from "app/store/global";
import { ColoredCheckbox, FiltersSidebar, TagsWrapper } from "app/widgets/common";

export const CalendarFilters = () => {
    const { showFilters, filters } = CalendarStore.use(
        state => ({
            showFilters: state.showFilters,
            filters: state.filters,
        }),
        shallowEqual
    );

    const { calendars, isGoogleAuthenticated, loading } = useCalendars();

    if (!showFilters) return null;

    const { showCalendars, showTasks, showBirthdays } = filters;

    // Filter local calendars
    const localCalendars = calendars.filter(c => c.source === "local");

    return (
        <FiltersSidebar header={translate("Calendar filters")}>
            <FormGroup label={translate("Local calendars")} style={{ marginBottom: 20 }}>
                {localCalendars.length === 0 ? (
                    <div className={Classes.TEXT_MUTED} style={{ fontSize: 13, padding: "8px 0" }}>
                        {translate("No local calendars")}
                    </div>
                ) : (
                    localCalendars.map(calendar => (
                        <LocalCalendarFilterRow
                            key={calendar.id}
                            calendar={calendar}
                            checked={showCalendars.includes(calendar.id)}
                        />
                    ))
                )}
            </FormGroup>

            <Checkbox
                label={translate("Show birthdays")}
                checked={showBirthdays}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    CalendarActions.setFilter("showBirthdays", event.currentTarget.checked)
                }
            />
            <Checkbox
                label={translate("Show tasks")}
                checked={showTasks}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    CalendarActions.setFilter("showTasks", event.currentTarget.checked)
                }
            />

            <GoogleCalendars
                calendars={calendars}
                isGoogleAuthenticated={isGoogleAuthenticated}
                loading={loading}
            />
        </FiltersSidebar>
    );
};

const LocalCalendarFilterRow = ({ calendar, checked }: { calendar: ICalendar; checked: boolean }) => {
    const [title, setTitle] = useState(calendar.title);
    const [color, setColor] = useState(calendar.color ?? "#FF8C00");

    const canEdit = Boolean(calendar.permissions);

    const handleSave = async () => {
        await CalendarActions.updateLocalCalendar(calendar.id, {
            title: title.trim() || calendar.title,
            color,
        });
    };

    const handleSetDefault = async () => {
        if (calendar.primary) return;
        await CalendarActions.setDefaultLocalCalendar(calendar.id);
    };

    const handlePermissions = () => {
        if (!calendar.permissions) return;
        showPermissions(calendar.permissions, updatedPermissions =>
            CalendarActions.updateLocalCalendarPermissions(calendar.id, updatedPermissions)
        );
    };

    return (
        <Row data-testid="local-calendar-filter">
            <Col fill>
                <ColoredCheckbox
                    text={calendar.primary ? `${calendar.title} (${translate("Default")})` : calendar.title}
                    color={calendar.color}
                    checked={checked}
                    onChange={() => CalendarActions.toggleCalendar(calendar.id)}
                />
            </Col>
            <Col collapse>
                <Popover
                    placement="bottom-end"
                    content={
                        <Menu>
                            <li style={{ padding: 8, width: 220 }}>
                                <FormGroup
                                    label={translate("Name")}
                                    labelFor={`calendar-title-${calendar.id}`}
                                >
                                    <InputGroup
                                        id={`calendar-title-${calendar.id}`}
                                        value={title}
                                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                            setTitle(event.currentTarget.value)
                                        }
                                        data-testid={`calendar-title-input-${calendar.id}`}
                                    />
                                </FormGroup>
                                <FormGroup
                                    label={translate("Color")}
                                    labelFor={`calendar-color-${calendar.id}`}
                                >
                                    <InputGroup
                                        id={`calendar-color-${calendar.id}`}
                                        type="color"
                                        value={color}
                                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                            setColor(event.currentTarget.value)
                                        }
                                        data-testid={`calendar-color-input-${calendar.id}`}
                                    />
                                </FormGroup>
                                <Button
                                    fill
                                    size="small"
                                    text={translate("Save")}
                                    onClick={handleSave}
                                    data-testid={`calendar-save-button-${calendar.id}`}
                                />
                            </li>
                            <MenuItem
                                text={translate("Set as default")}
                                icon={<Icon icon="check" />}
                                disabled={calendar.primary}
                                onClick={handleSetDefault}
                                data-testid={`calendar-default-button-${calendar.id}`}
                            />
                            <MenuItem
                                text={translate("Permissions")}
                                icon={<Icon icon="lock-01" />}
                                disabled={!canEdit}
                                onClick={handlePermissions}
                                data-testid={`calendar-permissions-button-${calendar.id}`}
                            />
                        </Menu>
                    }
                >
                    <Button
                        size="small"
                        variant="minimal"
                        icon={<Icon icon="dots-vertical" />}
                        data-testid={`calendar-actions-button-${calendar.id}`}
                    />
                </Popover>
            </Col>
        </Row>
    );
};

const GoogleCalendars = ({
    calendars,
    isGoogleAuthenticated,
    loading,
}: {
    calendars: ReturnType<typeof useCalendars>["calendars"];
    isGoogleAuthenticated: boolean;
    loading: boolean;
}) => {
    const filters = useCalendarsFilters();

    if (!isGoogleAuthenticated) return null;

    const { showCalendars } = filters;

    if (loading) {
        return (
            <FormGroup label={translate("Google calendars")}>
                <TagsWrapper vertical gap={10}>
                    {Array.from(Array(5).keys()).map(i => (
                        <div key={i} className={Classes.SKELETON} style={{ height: 20, width: "100%" }} />
                    ))}
                </TagsWrapper>
            </FormGroup>
        );
    }

    const googleCalendars = calendars.filter(c => c.source === "google");

    return (
        <FormGroup label={translate("Google calendars")} style={{ marginTop: 20 }}>
            {googleCalendars.map(calendar => (
                <ColoredCheckbox
                    text={calendar.title}
                    color={calendar.color}
                    key={calendar.id}
                    checked={showCalendars.includes(`google-${calendar.id}`)}
                    onChange={() => CalendarActions.toggleCalendar(`google-${calendar.id}`)}
                />
            ))}
        </FormGroup>
    );
};
