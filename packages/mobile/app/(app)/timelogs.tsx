// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ScrollView } from "react-native";
import type { ITimeLog } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchTimelogs } from "../../src/api/endpoints";

/** Duration stored in seconds; render as h:mm. */
function formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}h ${m}m`;
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

export default function TimelogsScreen() {
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
        </ScrollView>
    );
}
