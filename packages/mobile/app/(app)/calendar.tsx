// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMutation, useQuery } from "@tanstack/react-query";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal as RNModal, Platform, ScrollView } from "react-native";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import {
    Modal,
    ModalBackdrop,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { ICalendar, ICalendarEvent } from "@stacks/types";

import { createEvent, deleteEvent, fetchCalendars, fetchEvents, updateEvent } from "../../src/api/endpoints";
import { Icon } from "../../src/components/Icon/Icon";
import { queryClient } from "../../src/state/queryClient";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function startOfMonth(d: Date): Date {
    return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}
function addMonths(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function addDays(d: Date, n: number): Date {
    return new Date(d.getTime() + n * DAY_MS);
}
function sameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    );
}
function formatMonth(d: Date): string {
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function formatTime(d: Date): string {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: Date): string {
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The calendar for a given day cell, or the whole [from, to) range. */
function cellKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function CalendarScreen() {
    const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [editor, setEditor] = useState<ICalendarEvent | "new" | null>(null);

    const from = startOfDay(cursor);
    const to = new Date(from.getTime() + daysInMonth(cursor) * DAY_MS);

    const { data: events = [], isLoading } = useQuery({
        queryKey: ["events", cellKey(from), cellKey(to)],
        queryFn: () => fetchEvents(from, to),
    });

    const { data: calendars = [] } = useQuery({
        queryKey: ["calendars"],
        queryFn: fetchCalendars,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["events"] });

    const mutation = useMutation({
        mutationFn: async (patch: { id?: string } & Partial<ICalendarEvent>) => {
            if (patch.id) {
                const { id, ...rest } = patch;
                await updateEvent(id, rest);
            } else {
                const { id: _id, ...rest } = patch;
                await createEvent(rest);
            }
        },
        onSettled: () => invalidate(),
    });

    const cellEvents = (day: Date) => events.filter(e => sameDay(new Date(e.start), day));

    // Build the month grid (leading blanks from the first weekday).
    const firstWeekday = cursor.getDay();
    const totalCells = firstWeekday + daysInMonth(cursor);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < totalCells; i++) {
        if (i < firstWeekday) {
            cells.push(null);
        } else {
            cells.push(addDays(from, i - firstWeekday));
        }
    }

    const isToday = (d: Date) => sameDay(d, new Date());
    const isSelected = (d: Date) => !!selectedDay && sameDay(d, selectedDay);

    return (
        <Box className="flex-1 bg-background-0">
            {/* Month navigation header */}
            <HStack className="items-center justify-between px-3 py-2" space="sm">
                <Pressable onPress={() => setCursor(addMonths(cursor, -1))} className="p-2">
                    <Icon icon="chevron-left" size={20} color="#334155" />
                </Pressable>
                <Heading size="md" className="flex-1 text-center">
                    {formatMonth(cursor)}
                </Heading>
                <Pressable onPress={() => setCursor(addMonths(cursor, 1))} className="p-2">
                    <Icon icon="chevron-right" size={20} color="#334155" />
                </Pressable>
            </HStack>
            <Pressable onPress={() => setCursor(startOfMonth(new Date()))} className="mb-1">
                <Text size="sm" className="text-center text-primary-600">
                    Today
                </Text>
            </Pressable>

            {/* Weekday header */}
            <HStack>
                {["S", "M", "T", "W", "T", "F", "S"].map((wd, i) => (
                    <Text key={i} size="xs" className="flex-1 text-center text-typography-500 py-1">
                        {wd}
                    </Text>
                ))}
            </HStack>

            {isLoading ? (
                <Box className="py-10 justify-center items-center">
                    <Spinner />
                </Box>
            ) : (
                <VStack>
                    {chunkCells(cells).map((week, wi) => (
                        <HStack key={wi} className="flex-1">
                            {week.map((day, di) => {
                                if (!day) {
                                    return <Box key={di} className="flex-1 aspect-square" />;
                                }
                                const dayEvents = cellEvents(day).slice(0, 3);
                                const extra = cellEvents(day).length - dayEvents.length;
                                return (
                                    <Pressable
                                        key={di}
                                        className={`flex-1 aspect-square p-0.5 border border-outline-100 ${
                                            isSelected(day) ? "bg-primary-50" : ""
                                        }`}
                                        onPress={() => setSelectedDay(day)}
                                    >
                                        <VStack space="xs">
                                            <Box
                                                className={`w-6 h-6 rounded-full items-center justify-center ${
                                                    isToday(day) ? "bg-primary-600" : ""
                                                }`}
                                            >
                                                <Text
                                                    size="xs"
                                                    className={
                                                        isToday(day)
                                                            ? "text-white font-bold"
                                                            : "text-typography-800"
                                                    }
                                                >
                                                    {day.getDate()}
                                                </Text>
                                            </Box>
                                            {dayEvents.slice(0, 2).map(ev => (
                                                <Box
                                                    key={ev.id}
                                                    className="rounded-sm px-1 py-0.5 bg-primary-100 overflow-hidden"
                                                >
                                                    <Text
                                                        size="xs"
                                                        numberOfLines={1}
                                                        className="text-primary-800"
                                                    >
                                                        {ev.title}
                                                    </Text>
                                                </Box>
                                            ))}
                                            {extra > 0 ? (
                                                <Text size="xs" className="text-typography-500 px-1">
                                                    +{extra}
                                                </Text>
                                            ) : null}
                                        </VStack>
                                    </Pressable>
                                );
                            })}
                        </HStack>
                    ))}
                </VStack>
            )}

            {/* Day sheet */}
            <DaySheet
                day={selectedDay}
                events={selectedDay ? cellEvents(selectedDay) : []}
                onClose={() => setSelectedDay(null)}
                onAdd={() => setEditor("new")}
                onEdit={ev => setEditor(ev)}
            />

            {/* Event editor */}
            {editor ? (
                <EventEditor
                    editing={editor}
                    defaultDate={selectedDay ?? from}
                    calendars={calendars}
                    onClose={() => setEditor(null)}
                    onSave={async patch => {
                        await mutation.mutateAsync(patch);
                        setEditor(null);
                    }}
                    onDelete={
                        typeof editor !== "string"
                            ? async () => {
                                  await deleteEvent(editor.id);
                                  await invalidate();
                                  setEditor(null);
                              }
                            : undefined
                    }
                />
            ) : null}
        </Box>
    );
}

function daysInMonth(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function chunkCells<T>(arr: T[]): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += 7) out.push(arr.slice(i, i + 7));
    return out;
}

/* ------------------------------------------------------------------ */

function DaySheet({
    day,
    events,
    onClose,
    onAdd,
    onEdit,
}: {
    day: Date | null;
    events: ICalendarEvent[];
    onClose: () => void;
    onAdd: () => void;
    onEdit: (ev: ICalendarEvent) => void;
}) {
    return (
        <RNModal visible={!!day} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable
                className="flex-1 justify-end"
                style={{ backgroundColor: "#00000066" }}
                onPress={onClose}
            >
                <Pressable onPress={() => {}} className="bg-background-0 rounded-t-2xl p-4 pb-8 max-h-[70%]">
                    <HStack className="items-center justify-between mb-2">
                        <Heading size="md">{day ? fmtDate(day) : ""}</Heading>
                        <Pressable
                            onPress={onAdd}
                            className="flex-row items-center bg-primary-600 rounded-md px-3 py-1.5"
                        >
                            <Icon icon="plus" size={14} color="#ffffff" />
                            <Text size="sm" className="text-white ml-1">
                                Add
                            </Text>
                        </Pressable>
                    </HStack>
                    <ScrollView>
                        {events.length === 0 ? (
                            <Text className="text-typography-500 py-4 text-center">No events.</Text>
                        ) : (
                            events.map(ev => (
                                <Pressable
                                    key={ev.id}
                                    onPress={() => onEdit(ev)}
                                    className="py-2.5 border-b border-outline-100"
                                >
                                    <Text size="md" className="font-semibold text-typography-900">
                                        {ev.title}
                                    </Text>
                                    <Text size="xs" className="text-typography-500">
                                        {ev.allDay
                                            ? "All day"
                                            : `${formatTime(new Date(ev.start))} – ${formatTime(
                                                  new Date(ev.end)
                                              )}`}
                                    </Text>
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </RNModal>
    );
}

/* ------------------------------------------------------------------ */

function EventEditor({
    editing,
    defaultDate,
    calendars,
    onClose,
    onSave,
    onDelete,
}: {
    editing: ICalendarEvent | "new";
    defaultDate: Date | null;
    calendars: ICalendar[];
    onClose: () => void;
    onSave: (patch: { id?: string } & Partial<ICalendarEvent>) => void;
    onDelete?: () => void;
}) {
    const isNew = editing === "new";
    const base = isNew ? null : (editing as ICalendarEvent);

    const [title, setTitle] = useState(base?.title ?? "");
    const [description, setDescription] = useState(base?.description ?? "");
    const [allDay, setAllDay] = useState(base?.allDay ?? true);
    const [calendar, setCalendar] = useState(
        base?.calendar ?? calendars.find(c => c.primary)?.id ?? calendars[0]?.id ?? ""
    );
    const [start, setStart] = useState<Date>(() =>
        base ? new Date(base.start) : defaultDate ? startOfDay(defaultDate) : new Date()
    );
    const [end, setEnd] = useState<Date>(() =>
        base
            ? new Date(base.end)
            : defaultDate
            ? startOfDay(addDays(defaultDate, 1))
            : new Date(Date.now() + DAY_MS)
    );

    const canSave = title.trim().length > 0 && start <= end;

    const submit = () => {
        if (!canSave) return;
        const body: Partial<ICalendarEvent> & { id?: string } = {
            ...(base ? { id: base.id } : {}),
            title: title.trim(),
            description: description.trim(),
            allDay,
            calendar,
            start: start.toISOString() as unknown as Date,
            end: end.toISOString() as unknown as Date,
        };
        if (body.calendar === "") delete body.calendar;
        onSave(body);
    };

    return (
        <Modal isOpen onClose={onClose}>
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <Heading size="md">{isNew ? "New event" : "Edit event"}</Heading>
                </ModalHeader>
                <ModalBody>
                    <VStack space="sm">
                        <Input variant="outline">
                            <InputField placeholder="Title" value={title} onChangeText={setTitle} autoFocus />
                        </Input>
                        <Input variant="outline">
                            <InputField
                                placeholder="Description"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </Input>
                        <Field label="All day">
                            <Switch value={allDay} onValueChange={setAllDay} />
                        </Field>
                        <Field label="Start">
                            <DateTimeField
                                value={start}
                                onChange={setStart}
                                mode={allDay ? "date" : "datetime"}
                            />
                        </Field>
                        <Field label="End">
                            <DateTimeField
                                value={end}
                                onChange={setEnd}
                                mode={allDay ? "date" : "datetime"}
                            />
                        </Field>
                        {calendars.length > 0 ? (
                            <Field label="Calendar">
                                <VStack space="xs">
                                    {calendars.map(c => (
                                        <Pressable
                                            key={c.id}
                                            onPress={() => setCalendar(c.id)}
                                            className="flex-row items-center justify-between py-1.5"
                                        >
                                            <HStack space="sm" className="items-center">
                                                <Box
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: c.color ?? "#6366f1" }}
                                                />
                                                <Text size="sm" className="text-typography-800">
                                                    {c.title}
                                                </Text>
                                            </HStack>
                                            {calendar === c.id ? (
                                                <Icon icon="check" size={16} color="#2563eb" />
                                            ) : null}
                                        </Pressable>
                                    ))}
                                </VStack>
                            </Field>
                        ) : null}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    {onDelete ? (
                        <Button variant="outline" onPress={onDelete} className="mr-2">
                            <ButtonText className="text-error-600">Delete</ButtonText>
                        </Button>
                    ) : null}
                    <Button variant="outline" onPress={onClose} className="mr-2">
                        <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button onPress={submit} disabled={!canSave}>
                        <ButtonText>Save</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <HStack className="items-center justify-between">
            <Text size="sm" className="text-typography-600 w-20">
                {label}
            </Text>
            <Box className="flex-1">{children}</Box>
        </HStack>
    );
}

/**
 * A compact date/time picker field. On Android the native dialog is shown
 * directly (date, then time). On iOS an inline spinner sheet is used.
 */
function DateTimeField({
    value,
    onChange,
    mode,
}: {
    value: Date;
    onChange: (d: Date) => void;
    mode: "date" | "datetime";
}) {
    const [open, setOpen] = useState(false);
    const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

    const commitDate = (date: Date) => {
        if (mode === "date" || pickerMode === "time") {
            onChange(date);
        } else {
            onChange(date);
        }
    };

    const pill = (
        <Pressable
            onPress={() => {
                setPickerMode(mode === "datetime" ? "date" : "date");
                setOpen(true);
            }}
            className="flex-row items-center border border-outline-200 rounded-md px-3 py-2"
        >
            <Icon icon="calendar" size={16} color="#64748b" />
            <Text size="sm" className="ml-2 text-typography-800">
                {mode === "date" ? fmtDate(value) : `${fmtDate(value)} ${formatTime(value)}`}
            </Text>
        </Pressable>
    );

    if (Platform.OS === "android") {
        return (
            <>
                {pill}
                {open ? (
                    <DateTimePicker
                        value={value}
                        mode={pickerMode}
                        display="default"
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
                            if (mode === "date") {
                                setOpen(false);
                                if (event.type === "set" && date) onChange(date);
                                return;
                            }
                            // datetime: pick date first, then time
                            if (pickerMode === "date") {
                                if (date) onChange(date);
                                setPickerMode("time");
                            } else {
                                setOpen(false);
                                if (date) onChange(date);
                            }
                        }}
                    />
                ) : null}
            </>
        );
    }

    return (
        <>
            {pill}
            <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable
                    className="flex-1 justify-end"
                    style={{ backgroundColor: "#00000066" }}
                    onPress={() => setOpen(false)}
                >
                    <Pressable onPress={() => {}} className="bg-background-0 rounded-t-xl pb-5">
                        <HStack className="justify-between items-center p-3 border-b border-outline-200">
                            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                                <Text className="text-typography-500">Cancel</Text>
                            </Pressable>
                            <Text className="font-bold">
                                {pickerMode === "date" ? "Pick a date" : "Pick a time"}
                            </Text>
                            <Pressable
                                onPress={() => {
                                    if (mode === "datetime" && pickerMode === "date") {
                                        setPickerMode("time");
                                    } else {
                                        setOpen(false);
                                        onChange(value);
                                    }
                                }}
                                hitSlop={8}
                            >
                                <Text className="text-primary-600 font-semibold">
                                    {mode === "datetime" && pickerMode === "date" ? "Next" : "Done"}
                                </Text>
                            </Pressable>
                        </HStack>
                        <Box>
                            <DateTimePicker
                                value={value}
                                mode={pickerMode}
                                display="spinner"
                                onChange={(_e, date) => {
                                    if (date) onChange(date);
                                }}
                            />
                        </Box>
                    </Pressable>
                </Pressable>
            </RNModal>
        </>
    );
}
