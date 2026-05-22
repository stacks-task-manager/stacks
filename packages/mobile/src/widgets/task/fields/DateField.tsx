// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal as RNModal, Platform } from "react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

import { ValuePill } from "./ValuePill";

function formatDate(d: Date | string | null | undefined): string | null {
    if (!d) return null;
    try {
        const date = typeof d === "string" ? new Date(d) : d;
        if (Number.isNaN(date.getTime())) return null;
        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return null;
    }
}

/**
 * Editable date field. On Android the native dialog is shown directly (it's
 * already modal). On iOS the wheel picker is rendered inside a sheet with
 * explicit Cancel / Clear / Done actions since it's inline by default.
 */
export function DateField({
    value,
    onChange,
    disabled,
    placeholder = "No date",
    minimumDate,
    maximumDate,
}: {
    value: Date | string | null | undefined;
    onChange: (value: string | null) => void;
    disabled?: boolean;
    placeholder?: string;
    minimumDate?: Date;
    maximumDate?: Date;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Date>(() => {
        if (value) {
            const d = typeof value === "string" ? new Date(value) : value;
            if (!Number.isNaN(d.getTime())) return d;
        }
        return new Date();
    });

    const label = formatDate(value);

    const openPicker = () => {
        if (value) {
            const d = typeof value === "string" ? new Date(value) : value;
            if (!Number.isNaN(d.getTime())) setDraft(d);
        } else {
            setDraft(new Date());
        }
        setOpen(true);
    };

    const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
        setOpen(false);
        if (event.type === "set" && date) {
            onChange(date.toISOString());
        }
    };

    const pill = (
        <HStack className="items-center" space="sm">
            <ValuePill
                label={label}
                placeholder={placeholder}
                onPress={openPicker}
                disabled={disabled}
            />
            {value ? (
                <Pressable onPress={() => onChange(null)} hitSlop={8}>
                    <Text size="sm" className="text-error-600">
                        Clear
                    </Text>
                </Pressable>
            ) : null}
        </HStack>
    );

    if (Platform.OS === "android") {
        return (
            <>
                {pill}
                {open ? (
                    <DateTimePicker
                        value={draft}
                        mode="date"
                        display="default"
                        onChange={handleAndroidChange}
                        minimumDate={minimumDate}
                        maximumDate={maximumDate}
                    />
                ) : null}
            </>
        );
    }

    return (
        <>
            {pill}
            <RNModal
                visible={open}
                animationType="fade"
                transparent
                onRequestClose={() => setOpen(false)}
            >
                <Pressable
                    className="flex-1 justify-end"
                    style={{ backgroundColor: "#00000066" }}
                    onPress={() => setOpen(false)}
                >
                    <Pressable
                        onPress={() => {
                            /* swallow */
                        }}
                        className="bg-background-0 rounded-t-xl pb-5"
                    >
                        <HStack
                            className="justify-between items-center p-3 border-b border-outline-200"
                        >
                            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                                <Text className="text-typography-500">
                                    Cancel
                                </Text>
                            </Pressable>
                            <Text className="font-bold">Pick a date</Text>
                            <Pressable
                                onPress={() => {
                                    onChange(draft.toISOString());
                                    setOpen(false);
                                }}
                                hitSlop={8}
                            >
                                <Text className="text-primary-600 font-semibold">
                                    Done
                                </Text>
                            </Pressable>
                        </HStack>
                        <Box className="bg-background-0">
                            <DateTimePicker
                                value={draft}
                                mode="date"
                                display="spinner"
                                onChange={(_e, date) => {
                                    if (date) setDraft(date);
                                }}
                                minimumDate={minimumDate}
                                maximumDate={maximumDate}
                            />
                        </Box>
                    </Pressable>
                </Pressable>
            </RNModal>
        </>
    );
}
