// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import type { IProjectOverview } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchProjectOverview } from "../../../src/api/endpoints";

function StatCard({
    label,
    value,
    hint,
    intent = "default",
}: {
    label: string;
    value: string | number;
    hint?: string;
    intent?: "default" | "done" | "idle" | "danger";
}) {
    const accent =
        intent === "done"
            ? "text-emerald-600"
            : intent === "danger"
            ? "text-error-600"
            : intent === "idle"
            ? "text-typography-500"
            : "text-typography-900";
    return (
        <Box className="bg-background-0 border border-outline-200 rounded-md p-3 flex-1">
            <Text size="xs" className="text-typography-500">
                {label}
            </Text>
            <Text size="lg" className={`font-bold mt-0.5 ${accent}`}>
                {value}
            </Text>
            {hint ? (
                <Text size="xs" className="text-typography-500 mt-0.5">
                    {hint}
                </Text>
            ) : null}
        </Box>
    );
}

export default function ProjectBoardOverviewScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: overview, isLoading, isError } = useQuery<IProjectOverview>({
        queryKey: ["project-board-overview", id],
        queryFn: () => fetchProjectOverview(id),
    });

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (isError || !overview) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">
                    {isError ? "Failed to load board overview." : "No overview available."}
                </Text>
            </Box>
        );
    }

    const stacks = overview.stacksOverview ?? [];
    const stackTimes = overview.stacksTime ?? [];
    const tags = Object.entries(overview.tags ?? {}).sort((a, b) => b[1] - a[1]);

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            <VStack space="md">
                <Heading size="sm" className="text-typography-700">
                    Tasks
                </Heading>
                <HStack space="sm">
                    <StatCard label="Total" value={overview.tasksTotal} />
                    <StatCard label="Idle" value={overview.tasksIdle} intent="idle" />
                </HStack>
                <HStack space="sm">
                    <StatCard label="Doing" value={overview.tasksInProgress} />
                    <StatCard label="Done" value={overview.tasksCompleted} intent="done" />
                </HStack>
                <HStack space="sm">
                    <StatCard label="Overdue" value={overview.tasksOverdue} intent="danger" />
                    <StatCard label="Archived" value={overview.tasksArchived} />
                </HStack>

                <Heading size="sm" className="text-typography-700 mt-2">
                    Stacks
                </Heading>
                {stacks.length === 0 ? (
                    <Text size="sm" className="text-typography-500">
                        No stacks in this project.
                    </Text>
                ) : (
                    stacks.map(s => (
                        <StatRow
                            key={s.name}
                            name={s.name}
                            idle={s.idle}
                            doing={s.doing}
                            done={s.done}
                            overdue={s.overdue}
                        />
                    ))
                )}

                <Heading size="sm" className="text-typography-700 mt-2">
                    Estimates (hours)
                </Heading>
                {stackTimes.length === 0 ? (
                    <Text size="sm" className="text-typography-500">
                        No estimates yet.
                    </Text>
                ) : (
                    stackTimes.map(s => (
                        <Box
                            key={s.name}
                            className="bg-background-0 border border-outline-200 rounded-md px-3 py-2"
                        >
                            <HStack className="items-center justify-between">
                                <Text
                                    size="sm"
                                    className="font-semibold text-typography-900 flex-1 mr-2"
                                    numberOfLines={1}
                                >
                                    {s.name}
                                </Text>
                                <VStack className="items-end">
                                    <Text size="xs" className="text-typography-500">
                                        est {formatHours(s.estimated)} · spent {formatHours(s.spent)} ·
                                        rem {formatHours(s.remaining)}
                                    </Text>
                                </VStack>
                            </HStack>
                        </Box>
                    ))
                )}

                <Heading size="sm" className="text-typography-700 mt-2">
                    Tags
                </Heading>
                {tags.length === 0 ? (
                    <Text size="sm" className="text-typography-500">
                        No tags in this project.
                    </Text>
                ) : (
                    <HStack className="flex-wrap" space="sm">
                        {tags.map(([tag, count]) => (
                            <Box
                                key={tag}
                                className="bg-background-100 border border-outline-200 rounded-full px-3 py-1"
                            >
                                <Text size="xs" className="text-typography-700">
                                    {tag} · {count}
                                </Text>
                            </Box>
                        ))}
                    </HStack>
                )}
            </VStack>
        </ScrollView>
    );
}

function StatRow({
    name,
    idle,
    doing,
    done,
    overdue,
}: {
    name: string;
    idle: number;
    doing: number;
    done: number;
    overdue: number;
}) {
    return (
        <StatRowLayout
            name={name}
            cells={[
                { label: "Idle", value: idle },
                { label: "Doing", value: doing },
                { label: "Done", value: done },
                { label: "Overdue", value: overdue },
            ]}
        />
    );
}

function StatRowLayout({
    name,
    cells,
}: {
    name: string;
    cells: { label: string; value: string | number }[];
}) {
    return (
        <Box className="bg-background-0 border border-outline-200 rounded-md px-3 py-2">
            <HStack className="items-center justify-between">
                <Text
                    size="sm"
                    className="font-semibold text-typography-900 flex-1 mr-2"
                    numberOfLines={1}
                >
                    {name}
                </Text>
                <HStack className="items-center" space="md">
                    {cells.map(c => (
                        <VStack key={c.label} className="items-center">
                            <Text size="xs" className="text-typography-500">
                                {c.label}
                            </Text>
                            <Text size="sm" className="font-bold text-typography-800">
                                {c.value}
                            </Text>
                        </VStack>
                    ))}
                </HStack>
            </HStack>
        </Box>
    );
}

/** Seconds → "Xh Ym" (matches the overview convention). */
function formatHours(seconds: number): string {
    const total = Math.max(0, Math.round(seconds ?? 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h <= 0 && m <= 0) return "0m";
    if (h <= 0) return `${m}m`;
    if (m <= 0) return `${h}h`;
    return `${h}h ${m}m`;
}
