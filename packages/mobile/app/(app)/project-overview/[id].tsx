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
}: {
    label: string;
    value: string | number;
    hint?: string;
}) {
    return (
        <Box className="bg-background-0 border border-outline-200 rounded-md p-3 flex-1">
            <Text size="xs" className="text-typography-500">
                {label}
            </Text>
            <Text size="lg" className="font-bold text-typography-900 mt-0.5">
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

export default function ProjectOverviewScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: overview, isLoading, isError } = useQuery<IProjectOverview>({
        queryKey: ["project-overview", id],
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
                    {isError ? "Failed to load project overview." : "No overview available."}
                </Text>
            </Box>
        );
    }

    const completion = Math.round(overview.tasksCompletionPercentage ?? 0);
    const priorityTotal =
        overview.critical + overview.high + overview.medium + overview.low;
    const criticalPct = priorityTotal ? Math.round((overview.critical / priorityTotal) * 100) : 0;
    const highPct = priorityTotal ? Math.round((overview.high / priorityTotal) * 100) : 0;
    const mediumPct = priorityTotal ? Math.round((overview.medium / priorityTotal) * 100) : 0;
    const lowPct = priorityTotal ? Math.round((overview.low / priorityTotal) * 100) : 0;

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
                    <StatCard label="Idle" value={overview.tasksIdle} />
                </HStack>
                <HStack space="sm">
                    <StatCard label="In progress" value={overview.tasksInProgress} />
                    <StatCard label="Completed" value={overview.tasksCompleted} />
                </HStack>
                <HStack space="sm">
                    <StatCard label="Today" value={overview.tasksToday} />
                    <StatCard label="Overdue" value={overview.tasksOverdue} />
                </HStack>
                <HStack space="sm">
                    <StatCard label="Archived" value={overview.tasksArchived} />
                    <StatCard
                        label="Completion"
                        value={`${completion}%`}
                        hint={`${overview.tasksCompleted}/${overview.tasksTotal}`}
                    />
                </HStack>

                <Heading size="sm" className="text-typography-700 mt-2">
                    Priority breakdown
                </Heading>
                <HStack space="sm">
                    <StatCard label="Critical" value={overview.critical} hint={`${criticalPct}%`} />
                    <StatCard label="High" value={overview.high} hint={`${highPct}%`} />
                </HStack>
                <HStack space="sm">
                    <StatCard label="Medium" value={overview.medium} hint={`${mediumPct}%`} />
                    <StatCard label="Low" value={overview.low} hint={`${lowPct}%`} />
                </HStack>

                <Heading size="sm" className="text-typography-700 mt-2">
                    Time
                </Heading>
                <HStack space="sm">
                    <StatCard label="Estimated total" value={formatHours(overview.timeEstimatedTotal)} />
                    <StatCard label="Logged total" value={formatHours(overview.timeLoggedTotal)} />
                </HStack>
                <HStack space="sm">
                    <StatCard label="Remaining" value={formatHours(overview.timeRemaining)} />
                </HStack>

                <Heading size="sm" className="text-typography-700 mt-2">
                    Budget
                </Heading>
                <HStack space="sm">
                    <StatCard label="Estimated" value={formatMoney(overview.budgetEstimated)} />
                    <StatCard label="Spent" value={formatMoney(overview.budgetSpent)} />
                </HStack>
                <HStack space="sm">
                    <StatCard label="Profit" value={formatMoney(overview.budgetProfit)} />
                </HStack>
            </VStack>
        </ScrollView>
    );
}

/** Seconds → "Xh Ym" (matches the timelogs convention). */
function formatHours(seconds: number): string {
    const total = Math.max(0, Math.round(seconds ?? 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h <= 0 && m <= 0) return "0m";
    if (h <= 0) return `${m}m`;
    if (m <= 0) return `${h}h`;
    return `${h}h ${m}m`;
}

/** Currency amount → rounded 2-decimal string. */
function formatMoney(value: number): string {
    const n = Number(value ?? 0);
    return n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}