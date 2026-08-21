// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import type { IAttachment } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchAttachments } from "../../../src/api/endpoints";

/** Bytes → human-readable KB/MB string. */
function formatSize(bytes: number): string {
    const n = Math.max(0, Math.round(bytes ?? 0));
    if (n < 1024) return `${n} B`;
    const kb = n / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
}

export default function ProjectAttachmentsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const {
        data: attachments = [],
        isLoading,
        isError,
    } = useQuery<IAttachment[]>({
        queryKey: ["attachments", id],
        queryFn: () => fetchAttachments(id),
    });

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (isError) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">Failed to load attachments.</Text>
            </Box>
        );
    }

    if (attachments.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No attachments.</Text>
            </Box>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            <VStack space="xs">
                {attachments.map(file => (
                    <Pressable
                        key={file.id}
                        className="bg-background-0 border border-outline-200 rounded-md p-3"
                    >
                        <HStack className="items-center justify-between">
                            <VStack className="flex-1 mr-2" space="xs">
                                <Text
                                    size="sm"
                                    className="font-semibold text-typography-900"
                                    numberOfLines={1}
                                >
                                    {file.originalName}
                                </Text>
                                <Text size="xs" className="text-typography-500">
                                    {file.type}
                                </Text>
                            </VStack>
                            <Text size="xs" className="text-typography-700 font-semibold">
                                {formatSize(file.size)}
                            </Text>
                        </HStack>
                    </Pressable>
                ))}
            </VStack>
        </ScrollView>
    );
}
