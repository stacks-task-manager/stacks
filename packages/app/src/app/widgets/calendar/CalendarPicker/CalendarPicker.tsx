// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, Colors, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import { Stop } from "@blueprintjs/icons";
import React, { FunctionComponent, useMemo } from "react";

import { Col, Icon, Row } from "app/components/common";
import { useCalendars } from "app/hooks";

interface CalendarPickerProps {
    value?: string | null;
    disabled?: boolean;
    onChange: (calendarId: string, source: "local" | "google" | "microsoft") => void;
}

export const CalendarPicker: FunctionComponent<CalendarPickerProps> = ({ value, disabled, onChange }) => {
    const { calendars, isGoogleAuthenticated, loading } = useCalendars();

    const current = useMemo(() => {
        if (!value || value === "local") {
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
    }, [value, calendars]);

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
                    <MenuDivider title="Workspace" />
                    <MenuItem
                        text="Local calendar"
                        icon={<Stop color={Colors.ORANGE3} />}
                        labelElement={!value || value === "local" ? <Icon icon="check" /> : null}
                        onClick={() => onChange("local", "local")}
                    />
                    {isGoogleAuthenticated ? (
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
                                : calendars.map(calendar => (
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
