// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";

import type { ITimeLog } from "@stacks/types";
import { TIMELOG_STATUS } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { ScrollView } from "react-native";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchTimelogs } from "../../src/api/endpoints";
import { findPerson, usePeople } from "../../src/widgets";

/** Duration stored in seconds; render as h:mm. */
function formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}h ${m}m`;
}

export default function ApprovalsScreen() {
    const { data: logs = [], isLoading } = useQuery<ITimeLog[]>({
        queryKey: ["approvals"],
        queryFn: () => fetchTimelogs({ status: TIMELOG_STATUS.PENDING }),
    });

    const { data: people } = usePeople();

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
                <Text className="text-typography-600">No pending approvals.</Text>
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
                    Pending approvals
                </Heading>
                {logs.map(log => {
                    const person = findPerson(people, log.person);
                    const personLabel = person
                        ? `${person.email}`
                        : log.person;
                    return (
                        <Box
                            key={log.id}
                            className="bg-background-0 border border-outline-200 rounded-md p-3"
                        >
                            <HStack className="items-start justify-between">
                                <VStack className="flex-1 mr-2" space="xs">
                                    <Text
                                        size="sm"
                                        className="font-semibold text-typography-900"
                                        numberOfLines={1}
                                    >
                                        {log.taskInfo?.title ?? log.task}
                                    </Text>
                                    <Text size="xs" className="text-typography-500" numberOfLines={1}>
                                        {log.documentInfo?.title ?? log.project}
                                    </Text>
                                    {log.description ? (
                                        <Text size="sm" className="text-typography-700" numberOfLines={2}>
                                            {log.description}
                                        </Text>
                                    ) : null}
                                    <Text size="xs" className="text-typography-500" numberOfLines={1}>
                                        {personLabel}
                                    </Text>
                                </VStack>
                                <Text size="sm" className="font-semibold text-typography-900">
                                    {formatDuration(log.duration)}
                                </Text>
                            </HStack>
                        </Box>
                    );
                })}
            </VStack>
        </ScrollView>
    );
}