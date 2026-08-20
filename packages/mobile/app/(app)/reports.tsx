// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView } from "react-native";
import type { IReport, REPORT_TYPE } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchReport, fetchReports } from "../../src/api/endpoints";

/**
 * Walk an unknown report payload and collect primitive (number/string/boolean)
 * values into readable "key: value" lines. Nested objects are descended into
 * one level via a stack so it never recurses unboundedly, and every branch is
 * guarded so unknown shapes can't crash the screen.
 */
function summarizePayload(payload: unknown): string[] {
    const lines: string[] = [];
    const stack: Array<{ value: unknown; prefix: string; depth: number }> = [
        { value: payload, prefix: "", depth: 0 },
    ];
    const MAX_DEPTH = 6;

    while (stack.length > 0) {
        const { value, prefix, depth } = stack.pop() as {
            value: unknown;
            prefix: string;
            depth: number;
        };

        if (value === null || value === undefined) {
            continue;
        }

        if (typeof value === "number" || typeof value === "boolean") {
            lines.push(`${prefix}: ${String(value)}`);
            continue;
        }

        if (typeof value === "string") {
            if (value.length > 0) {
                lines.push(`${prefix}: ${value}`);
            }
            continue;
        }

        if (Array.isArray(value)) {
            if (depth >= MAX_DEPTH) continue;
            for (let i = 0; i < value.length; i++) {
                stack.push({
                    value: value[i],
                    prefix: prefix ? `${prefix}[${i}]` : `[${i}]`,
                    depth: depth + 1,
                });
            }
            continue;
        }

        if (typeof value === "object") {
            if (depth >= MAX_DEPTH) continue;
            const record = value as Record<string, unknown>;
            for (const key of Object.keys(record)) {
                stack.push({
                    value: record[key],
                    prefix: prefix ? `${prefix}.${key}` : key,
                    depth: depth + 1,
                });
            }
            continue;
        }
    }

    return lines;
}

export default function ReportsScreen() {
    const [selected, setSelected] = useState<IReport | null>(null);

    const { data: reports = [], isLoading } = useQuery({
        queryKey: ["reports"],
        queryFn: fetchReports,
    });

    const { data: payload, isFetching: payloadLoading } = useQuery({
        queryKey: ["report", selected?.type],
        queryFn: () => fetchReport(selected?.type as REPORT_TYPE),
        enabled: !!selected,
    });

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (reports.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No reports</Text>
            </Box>
        );
    }

    const summaryLines = payload ? summarizePayload(payload) : [];

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            <VStack space="xs" className="mb-5">
                <Heading size="sm" className="px-1 mb-1 text-typography-700">
                    Reports
                </Heading>
                {reports.map(report => {
                    const isActive = selected?.type === report.type;
                    return (
                        <Pressable
                            key={report.type}
                            onPress={() => setSelected(isActive ? null : report)}
                            className={`bg-background-0 border rounded-md p-3 ${
                                isActive ? "border-primary-600" : "border-outline-200"
                            }`}
                        >
                            <HStack className="items-stretch">
                                <Box
                                    style={{ backgroundColor: report.color }}
                                    className="w-1.5 rounded-sm mr-3 self-stretch"
                                />
                                <VStack className="flex-1" space="xs">
                                    <Text size="sm" className="font-semibold text-typography-900" numberOfLines={1}>
                                        {report.title}
                                    </Text>
                                    {report.description ? (
                                        <Text size="xs" className="text-typography-500" numberOfLines={2}>
                                            {report.description}
                                        </Text>
                                    ) : null}
                                </VStack>
                            </HStack>
                        </Pressable>
                    );
                })}
            </VStack>

            {selected ? (
                <VStack space="xs" className="mt-2">
                    <Heading size="sm" className="px-1 mb-1 text-typography-700">
                        {selected.title}
                    </Heading>
                    {payloadLoading ? (
                        <Box className="py-6 items-center">
                            <Spinner />
                        </Box>
                    ) : summaryLines.length === 0 ? (
                        <Box className="py-6 items-center">
                            <Text className="text-typography-600">No data for this report.</Text>
                        </Box>
                    ) : (
                        <Box className="bg-background-0 border border-outline-200 rounded-md p-3">
                            {summaryLines.map((line, idx) => (
                                <Text key={idx} size="xs" className="text-typography-700 py-0.5">
                                    {line}
                                </Text>
                            ))}
                        </Box>
                    )}
                </VStack>
            ) : null}
        </ScrollView>
    );
}