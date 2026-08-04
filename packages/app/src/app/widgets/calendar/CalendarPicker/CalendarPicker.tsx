// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, Colors, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import { Stop } from "@blueprintjs/icons";
import React, { FunctionComponent, useMemo } from "react";

import { Col, Icon, Row } from "app/components/common";
import { useCalendars } from "app/hooks";
import { ICalendarSource } from "@stacks/types";

interface CalendarPickerProps {
    value?: string | null;
    allowedSources?: ICalendarSource[];
    disabled?: boolean;
    onChange: (calendarId: string, source: ICalendarSource) => void;
}

export const CalendarPicker: FunctionComponent<CalendarPickerProps> = ({
    value,
    allowedSources,
    disabled,
    onChange,
}) => {
    const { calendars, isGoogleAuthenticated, loading } = useCalendars();
    const sourceAllowed = (source: ICalendarSource) => !allowedSources || allowedSources.includes(source);

    const localCalendars = calendars.filter(c => c.source === "local" && sourceAllowed("local"));
    const googleCalendars = calendars.filter(c => c.source === "google" && sourceAllowed("google"));

    const current = useMemo(() => {
        if (!value) {
            // Return default local calendar if available
            const defaultLocal = localCalendars.find(c => c.primary);
            if (defaultLocal) {
                return { title: defaultLocal.title, color: defaultLocal.color };
            }
            return {
                title: "Local calendar",
                color: Colors.ORANGE3,
            };
        }
        const calendar = calendars.find(calendar => calendar.id === value);
        if (calendar) {
            return calendar;
        }

        return {
            title: "Unknown calendar",
            color: Colors.RED1,
        };
    }, [value, calendars, localCalendars]);

    if (disabled) {
        return (
            <Row gutter={5}>
                <Col width={20} align="center">
                    <Stop color={current.color} />
                </Col>
                <Col align="center">{current.title}</Col>
            </Row>
        );
    }

    return (
        <Popover
            content={
                <Menu>
                    {sourceAllowed("local") ? (
                        <>
                            <MenuDivider title="Local calendars" />
                            {localCalendars.length === 0 ? (
                                <MenuItem
                                    text="No local calendars"
                                    icon={<Stop color={Colors.GRAY4} />}
                                    disabled
                                />
                            ) : (
                                localCalendars.map(calendar => (
                                    <MenuItem
                                        key={calendar.id}
                                        text={calendar.title}
                                        icon={<Stop color={calendar.color} />}
                                        labelElement={value === calendar.id ? <Icon icon="check" /> : null}
                                        onClick={() => onChange(calendar.id, "local")}
                                    />
                                ))
                            )}
                        </>
                    ) : null}
                    {isGoogleAuthenticated && sourceAllowed("google") ? (
                        <>
                            <MenuDivider title="Google" />
                            {loading
                                ? [...Array(5).keys()].map(i => (
                                      <MenuItem
                                          key={i}
                                          text="Lorem ipsum"
                                          className={Classes.SKELETON}
                                          style={{ marginBottom: 5 }}
                                      />
                                  ))
                                : googleCalendars.map(calendar => (
                                      <MenuItem
                                          key={calendar.id}
                                          text={calendar.title}
                                          icon={<Stop color={calendar.color} />}
                                          labelElement={value === calendar.id ? <Icon icon="check" /> : null}
                                          disabled={calendar.readOnly}
                                          onClick={() => onChange(calendar.id, calendar.source)}
                                      />
                                  ))}
                        </>
                    ) : null}
                </Menu>
            }
            minimal
            placement="bottom"
            matchTargetWidth
            renderTarget={({ isOpen, ...props }) => (
                <Button
                    icon={<Stop color={current.color} />}
                    endIcon={<Icon icon="chevron-down" />}
                    alignText="left"
                    fill
                    active={isOpen}
                    {...props}
                >
                    {current.title}
                </Button>
            )}
        />
    );
};
