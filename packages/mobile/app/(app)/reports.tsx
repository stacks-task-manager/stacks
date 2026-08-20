// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView } from "react-native";
import type { IReport, REPORT_TYPE } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
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

function ReportModal({
    report,
    onClose,
}: {
    report: IReport | null;
    onClose: () => void;
}) {
    const { data: payload, isFetching: loading } = useQuery({
        queryKey: ["report", report?.type],
        queryFn: () => fetchReport(report?.type as REPORT_TYPE),
        enabled: !!report,
    });

    const summaryLines = payload ? summarizePayload(payload) : [];

    return (
        <Modal isOpen={!!report} onClose={onClose}>
            <ModalBackdrop />
            <ModalContent className="max-w-[95%] w-full">
                <ModalHeader>
                    <HStack space="sm" className="items-center">
                        <Box
                            style={{ backgroundColor: report?.color ?? "#3b82f6" }}
                            className="w-1.5 rounded-sm self-stretch"
                        />
                        <Heading size="md" className="flex-1 text-typography-900">
                            {report?.title}
                        </Heading>
                    </HStack>
                </ModalHeader>
                <ModalBody>
                    {loading ? (
                        <Box className="py-10 items-center">
                            <Spinner />
                        </Box>
                    ) : summaryLines.length === 0 ? (
                        <Box className="py-10 items-center">
                            <Text className="text-typography-600">
                                No data for this report.
                            </Text>
                        </Box>
                    ) : (
                        <Box className="bg-background-100 border border-outline-200 rounded-md p-3">
                            {summaryLines.map((line, idx) => (
                                <Text
                                    key={idx}
                                    size="sm"
                                    className="text-typography-700 py-1"
                                >
                                    {line}
                                </Text>
                            ))}
                        </Box>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onPress={onClose}>
                        <ButtonText>Close</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export default function ReportsScreen() {
    const [active, setActive] = useState<IReport | null>(null);

    const { data: reports = [], isLoading } = useQuery({
        queryKey: ["reports"],
        queryFn: fetchReports,
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

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            <VStack space="xs" className="mb-5">
                <Heading size="sm" className="px-1 mb-1 text-typography-700">
                    Reports
                </Heading>
                {reports.map(report => (
                    <Pressable
                        key={report.type}
                        onPress={() => setActive(report)}
                        className="bg-background-0 border border-outline-200 rounded-md p-3"
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
                ))}
            </VStack>

            <ReportModal report={active} onClose={() => setActive(null)} />
        </ScrollView>
    );
}