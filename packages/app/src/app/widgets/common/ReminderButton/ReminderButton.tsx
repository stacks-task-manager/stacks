// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    HTMLSelect,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    NumericInput,
    Placement,
    Popover,
    Tooltip,
    mergeRefs,
} from "@blueprintjs/core";
import { DatePicker, TimePrecision } from "@blueprintjs/datetime";
import { format, setHours, setMinutes, addDays, addWeeks, endOfWeek, setDay } from "date-fns";
import React, { FunctionComponent, useCallback, useMemo, useState } from "react";
import { is24Hours } from "../../../utils/date";
import { Col, Grid, Icon, Row } from "app/components/common";
import { usePreferences } from "app/hooks";

interface ReminderButtonProps {
    reminders: Date[];
    verbose?: boolean;
    placement?: Placement;
    disabled?: boolean;
    tooltipPlacement?: Placement;
    onAdd?: (date: Date) => void;
    onRemove?: (date: Date) => void;
    onRemoveAll?: () => void;
    onPopupToggle?: (openState: boolean) => void;
}
export const ReminderButton: FunctionComponent<ReminderButtonProps> = ({
    reminders,
    verbose,
    placement,
    disabled,
    tooltipPlacement,
    onAdd,
    onRemove,
    onRemoveAll,
    onPopupToggle,
}) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const { dateLocale } = usePreferences(["dateLocale"]);
    const useAmPm = !is24Hours();

    const notificationTooltip = useMemo(() => {
        if (reminders.length === 0) return "Add a reminder";

        return "Manage reminders";
    }, [reminders]);

    const handleSetDate = useCallback(
        (selectedDate: Date | null, isUserChange: boolean) => {
            if (isUserChange) setSelectedDate(selectedDate ?? undefined);
        },
        [verbose]
    );

    const date = useMemo(() => {
        const now = new Date();
        const timeFormat = useAmPm ? "eee, p" : "eee, HH:mm";

        return [
            {
                title: "Later today",
                label: format(setMinutes(setHours(now, 18), 0), timeFormat),
                date: setMinutes(setHours(now, 18), 0),
            },
            {
                title: translate("Tomorrow"),
                label: format(setMinutes(setHours(addDays(now, 1), 8), 0), timeFormat),
                date: setMinutes(setHours(addDays(now, 1), 8), 0),
            },
            {
                title: "This weekend",
                label: format(setMinutes(setHours(endOfWeek(now), 8), 0), timeFormat),
                date: setMinutes(setHours(endOfWeek(now), 8), 0),
            },
            {
                title: translate("Next week"),
                label: format(setMinutes(setHours(setDay(addWeeks(now, 1), 1), 8), 0), timeFormat),
                date: setMinutes(setHours(setDay(addWeeks(now, 1), 1), 8), 0),
            },
        ];
    }, [useAmPm]);

    return (
        <Popover
            placement={placement}
            content={
                <Menu>
                    {onAdd ? (
                        <>
                            {date.map((item, index) => (
                                <MenuItem
                                    key={index}
                                    text={item.title}
                                    labelElement={item.label}
                                    onClick={() => onAdd(item.date)}
                                />
                            ))}

                            <MenuDivider />
                            <MenuItem text="Pick date & time" icon={<Icon icon="calendar-date" />}>
                                <DatePicker
                                    value={selectedDate}
                                    minDate={new Date()}
                                    timePrecision={TimePrecision.MINUTE}
                                    locale={dateLocale}
                                    highlightCurrentDay
                                    onChange={handleSetDate}
                                    timePickerProps={{
                                        useAmPm,
                                    }}
                                    footerElement={
                                        <Row justify="center" gutter={20}>
                                            <Button
                                                small
                                                intent={Intent.PRIMARY}
                                                disabled={!selectedDate}
                                                icon={<Icon icon="bell" />}
                                                onClick={selectedDate ? () => onAdd(selectedDate) : undefined}
                                            >
                                                Set reminder
                                            </Button>
                                        </Row>
                                    }
                                />
                            </MenuItem>
                        </>
                    ) : null}
                    {reminders.length ? (
                        <>
                            <MenuDivider title="Scheduled reminders" />
                            {reminders.sort().map((notification, index) => (
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                <Tooltip
                                    key={index}
                                    disabled={onRemove == null}
                                    content="Click to remove scheduled reminder"
                                    hoverOpenDelay={1000}
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    renderTarget={({ isOpen, ref, ...tooltipProps }) => (
                                        <MenuItem
                                            ref={ref}
                                            {...tooltipProps}
                                            text={format(notification, "PPPp")}
                                            intent={onRemove != null ? Intent.WARNING : Intent.NONE}
                                            icon={<Icon icon="bell-ringing-01" />}
                                            shouldDismissPopover={false}
                                            onClick={onRemove ? () => onRemove(notification) : undefined}
                                        />
                                    )}
                                />
                            ))}
                            {reminders.length > 1 && onRemoveAll != null ? (
                                <>
                                    <MenuDivider />
                                    <MenuItem
                                        text="Remove all"
                                        intent={Intent.DANGER}
                                        onClick={onRemoveAll}
                                        icon={<Icon icon="trash" />}
                                        shouldDismissPopover={false}
                                    />
                                </>
                            ) : null}
                        </>
                    ) : null}
                </Menu>
            }
            disabled={disabled}
            renderTarget={({ isOpen: popoverOpen, ref: popoverRef, ...popoverProps }) => (
                <Tooltip
                    content={notificationTooltip}
                    placement={tooltipPlacement ?? "top-end"}
                    disabled={popoverOpen}
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref: tooltipRef, ...tooltipProps }) => (
                        <Button
                            {...popoverProps}
                            {...tooltipProps}
                            ref={mergeRefs(popoverRef, tooltipRef)}
                            variant="minimal"
                            size="small"
                            disabled={disabled}
                            intent={reminders.length ? Intent.WARNING : Intent.NONE}
                            icon={<Icon icon={reminders.length != null ? "bell-ringing-01" : "bell"} />}
                        />
                    )}
                />
            )}
            onOpening={onPopupToggle ? () => onPopupToggle(true) : undefined}
            onClosed={onPopupToggle ? () => onPopupToggle(false) : undefined}
        />
    );
};

interface ReminderMenuItemsProps {
    value?: number;
    onChange: (time: number | undefined) => void;
}
export const ReminderMenuItems: FunctionComponent<ReminderMenuItemsProps> = ({ value, onChange }) => {
    const [custom, setCustom] = useState(-1);
    const [span, setSpan] = useState(0);

    return (
        <>
            <MenuItem
                text={translate("None")}
                labelElement={value === undefined ? <Icon icon="check" /> : null}
                onClick={() => onChange(undefined)}
            />
            <MenuDivider />
            <MenuItem
                text={translate("At time of event")}
                labelElement={value === 0 ? <Icon icon="check" /> : null}
                onClick={() => onChange(0)}
            />
            <MenuItem
                text={translate("5 minutes before")}
                labelElement={value === -5 ? <Icon icon="check" /> : null}
                onClick={() => onChange(-5)}
            />
            <MenuItem
                text={translate("10 minutes before")}
                labelElement={value === -10 ? <Icon icon="check" /> : null}
                onClick={() => onChange(-10)}
            />
            <MenuItem
                text={translate("15 minutes before")}
                labelElement={value === -15 ? <Icon icon="check" /> : null}
                onClick={() => onChange(-15)}
            />
            <MenuItem
                text={translate("30 minutes before")}
                labelElement={value === -30 ? <Icon icon="check" /> : null}
                onClick={() => onChange(-30)}
            />
            <MenuItem
                text={translate("1 hour before")}
                labelElement={value === -60 ? <Icon icon="check" /> : null}
                onClick={() => onChange(-60)}
            />
            <MenuItem
                text={translate("2 hours before")}
                labelElement={value === -120 ? <Icon icon="check" /> : null}
                onClick={() => onChange(-120)}
            />
            <MenuItem
                text={translate("1 day before")}
                labelElement={value === -1440 ? <Icon icon="check" /> : null}
                onClick={() => onChange(-1440)}
            />
            <MenuItem
                text={translate("2 days before")}
                labelElement={value === -2880 ? <Icon icon="check" /> : null}
                onClick={() => onChange(-2880)}
            />
            <MenuDivider />
            <MenuItem text={translate("Custom")}>
                <div style={{ minWidth: 250 }}>
                    <Grid>
                        <Row gutter={10}>
                            <Col collapse>
                                <NumericInput
                                    value={span}
                                    onValueChange={handleChangeSpan}
                                    min={0}
                                    buttonPosition="none"
                                    style={{ width: 100 }}
                                />
                            </Col>
                            <Col fill>
                                <HTMLSelect value={custom} onChange={handleChangeCustom}>
                                    <option value={-1}>{translate("minutes before")}</option>
                                    <option value={-60}>{translate("hours before")}</option>
                                    <option value={-1440}>{translate("days before")}</option>
                                    <option value={1}>{translate("minutes after")}</option>
                                    <option value={60}>{translate("hours after")}</option>
                                    <option value={1440}>{translate("days after")}</option>
                                </HTMLSelect>
                            </Col>
                        </Row>
                        <Row gutter={10}>
                            <Col>
                                <Button size="small" fill className={Classes.POPOVER_DISMISS}>
                                    {translate("Cancel")}
                                </Button>
                            </Col>
                            <Col>
                                <Button
                                    size="small"
                                    fill
                                    intent={Intent.PRIMARY}
                                    className={Classes.POPOVER_DISMISS}
                                    onClick={handleSubmitCustom}
                                >
                                    {translate("Save")}
                                </Button>
                            </Col>
                        </Row>
                    </Grid>
                </div>
            </MenuItem>
        </>
    );

    function handleChangeCustom(event: React.ChangeEvent<HTMLSelectElement>) {
        setCustom(Number(event.currentTarget.value));
    }

    function handleChangeSpan(valueAsNumber: number) {
        setSpan(valueAsNumber);
    }

    function handleSubmitCustom() {
        onChange(custom * span);
    }
};
