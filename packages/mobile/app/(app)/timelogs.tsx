// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import type { ITimeLog, TIMELOG_STATUS } from "@stacks/types";

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

import { deleteTimelog, fetchTimelogs, updateTimelog } from "../../src/api/endpoints";
import { queryClient } from "../../src/state/queryClient";

/** Duration stored in seconds; render as h:mm. */
function formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}h ${m}m`;
}

/** Duration in seconds -> "HH:MM" string for the input. */
function durationToHM(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" string -> seconds; invalid/empty falls back to the previous value. */
function hmToSeconds(value: string, fallback: number): number {
    const m = /^\s*(\d+)\s*:\s*(\d{1,2})\s*$/.exec(value);
    if (!m) return fallback;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (min > 59) return fallback;
    return (h * 60 + min) * 60;
}

function formatDate(iso?: string | Date): string {
    if (!iso) return "";
    const d = iso instanceof Date ? iso : new Date(iso as string);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function statusColor(status?: string): string {
    switch (status) {
        case "approved":
            return "#16a34a";
        case "rejected":
            return "#dc2626";
        case "inreview":
            return "#d97706";
        default:
            return "#64748b";
    }
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "inreview", label: "In review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
];

function TimelogEditorModal({
    log,
    onClose,
}: {
    log: ITimeLog | null;
    onClose: () => void;
}) {
    const [description, setDescription] = useState("");
    const [hm, setHm] = useState("");
    const [billable, setBillable] = useState(false);
    const [status, setStatus] = useState<string>("pending");

    // Reset local state whenever a different log is opened.
    const [lastId, setLastId] = useState<string | null>(null);
    if (log && log.id !== lastId) {
        setLastId(log.id);
        setDescription(log.description ?? "");
        setHm(durationToHM(log.duration));
        setBillable(!!log.billable);
        setStatus(log.status);
    }
    if (!log && lastId !== null) {
        setLastId(null);
    }

    const invalidate = () =>
        void queryClient.invalidateQueries({ queryKey: ["timelogs"] });

    const update = useMutation({
        mutationFn: (patch: Partial<ITimeLog>) => updateTimelog(log!.id, patch),
        onSuccess: () => invalidate(),
    });

    const remove = useMutation({
        mutationFn: () => deleteTimelog(log!.id),
        onSuccess: () => {
            invalidate();
            onClose();
        },
    });

    const canSave = !update.isPending;

    const save = () => {
        if (!log) return;
        const duration = hmToSeconds(hm, log.duration);
        update.mutate({
            description: description.trim() || undefined,
            duration,
            billable,
            status: status as TIMELOG_STATUS,
        });
    };

    return (
        <Modal isOpen={!!log} onClose={onClose}>
            <ModalBackdrop />
            <ModalContent className="max-w-[95%] w-full">
                <ModalHeader>
                    <Heading size="md" className="text-typography-900">
                        Edit time log
                    </Heading>
                </ModalHeader>
                <ModalBody>
                    <VStack space="md">
                        <VStack space="xs">
                            <Text size="sm" className="font-semibold text-typography-800">
                                Task
                            </Text>
                            <Text size="sm" className="text-typography-700">
                                {log?.taskInfo?.title ?? log?.task}
                            </Text>
                            <Text size="xs" className="text-typography-500">
                                {log?.documentInfo?.title ?? log?.project} ·{" "}
                                {log ? formatDate(log.date) : ""}
                            </Text>
                        </VStack>

                        <Divider />

                        <VStack space="xs">
                            <Text size="sm" className="font-semibold text-typography-800">
                                Description
                            </Text>
                            <Input size="md">
                                <InputField
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Work description"
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </Input>
                        </VStack>

                        <VStack space="xs">
                            <Text size="sm" className="font-semibold text-typography-800">
                                Duration (h:mm)
                            </Text>
                            <Input size="md">
                                <InputField
                                    value={hm}
                                    onChangeText={setHm}
                                    placeholder="e.g. 01:30"
                                    keyboardType="numbers-and-punctuation"
                                    autoCapitalize="none"
                                />
                            </Input>
                        </VStack>

                        <HStack className="items-center justify-between">
                            <Text size="sm" className="font-semibold text-typography-800">
                                Billable
                            </Text>
                            <Switch
                                value={billable}
                                onValueChange={setBillable}
                                disabled={update.isPending}
                            />
                        </HStack>

                        <VStack space="xs">
                            <Text size="sm" className="font-semibold text-typography-800">
                                Status
                            </Text>
                            <HStack space="sm" className="flex-wrap">
                                {STATUS_OPTIONS.map(opt => {
                                    const selected = status === opt.value;
                                    return (
                                        <Pressable
                                            key={opt.value}
                                            onPress={() => setStatus(opt.value)}
                                            className={`py-1.5 px-3 rounded-full border ${
                                                selected
                                                    ? "border-primary-500 bg-primary-50"
                                                    : "border-outline-300 bg-background-0"
                                            }`}
                                        >
                                            <Text
                                                size="xs"
                                                className={`font-semibold ${
                                                    selected
                                                        ? "text-primary-700"
                                                        : "text-typography-600"
                                                }`}
                                            >
                                                {opt.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </HStack>
                        </VStack>

                        {update.isError ? (
                            <Text size="sm" className="text-error-600">
                                Could not save changes.
                            </Text>
                        ) : null}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        size="sm"
                        variant="outline"
                        onPress={() => void remove.mutate()}
                        isDisabled={remove.isPending}
                    >
                        <ButtonText className="text-error-600">Delete</ButtonText>
                    </Button>
                    <HStack space="sm">
                        <Button size="sm" variant="outline" onPress={onClose}>
                            <ButtonText>Cancel</ButtonText>
                        </Button>
                        <Button
                            size="sm"
                            onPress={save}
                            isDisabled={!canSave || update.isPending}
                        >
                            <ButtonText>{update.isPending ? "Saving…" : "Save"}</ButtonText>
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export default function TimelogsScreen() {
    const [editing, setEditing] = useState<ITimeLog | null>(null);

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ["timelogs"],
        queryFn: () => fetchTimelogs({}),
    });

    const groups = useMemo(() => {
        const byDate = new Map<string, ITimeLog[]>();
        for (const log of logs) {
            const key = log.date ? new Date(log.date).toDateString() : "Other";
            const list = byDate.get(key) ?? [];
            list.push(log);
            byDate.set(key, list);
        }
        return Array.from(byDate.entries());
    }, [logs]);

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (logs.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No time logged yet.</Text>
            </Box>
        );
    }

    return (
        <ScrollView className="flex-1 bg-background-0" contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
            {groups.map(([date, dayLogs]) => (
                <VStack key={date} space="xs" className="mb-5">
                    <Heading size="sm" className="px-1 mb-1 text-typography-700">
                        {formatDate(date)}
                    </Heading>
                    {dayLogs.map(log => (
                        <Pressable
                            key={log.id}
                            onPress={() => setEditing(log)}
                            className="bg-background-0 border border-outline-200 rounded-md p-3"
                        >
                            <HStack className="items-start justify-between">
                                <VStack className="flex-1 mr-2" space="xs">
                                    <Text size="sm" className="font-semibold text-typography-900" numberOfLines={1}>
                                        {log.taskInfo?.title ?? log.task}
                                    </Text>
                                    <Text size="xs" className="text-typography-500">
                                        {log.documentInfo?.title ?? log.project}
                                    </Text>
                                    {log.description ? (
                                        <Text size="sm" className="text-typography-700" numberOfLines={2}>
                                            {log.description}
                                        </Text>
                                    ) : null}
                                </VStack>
                                <VStack space="xs" className="items-end">
                                    <Text size="sm" className="font-semibold text-typography-900">
                                        {formatDuration(log.duration)}
                                    </Text>
                                    <Text size="xs" className="text-typography-500" style={{ color: statusColor(log.status) }}>
                                        {log.status}
                                    </Text>
                                </VStack>
                            </HStack>
                        </Pressable>
                    ))}
                </VStack>
            ))}

            <TimelogEditorModal log={editing} onClose={() => setEditing(null)} />
        </ScrollView>
    );
}
