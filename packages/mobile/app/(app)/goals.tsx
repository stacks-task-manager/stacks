// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView } from "react-native";
import type { TreeNode } from "@stacks/types";
import { RECORDTYPE } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchDocuments } from "../../src/api/endpoints";

export default function GoalsScreen() {
    const router = useRouter();

    const { data: documents, isLoading } = useQuery({
        queryKey: ["documents"],
        queryFn: fetchDocuments,
    });

    const goals = useMemo<TreeNode[]>(
        () => (documents?.documents ?? []).filter(d => d.type === RECORDTYPE.GOAL),
        [documents]
    );

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (goals.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No goals.</Text>
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
                    Goals
                </Heading>
                {goals.map(doc => (
                    <Pressable
                        key={doc.id}
                        onPress={() => router.push(`/(app)/document/${doc.id}` as never)}
                        className="bg-background-0 border border-outline-200 rounded-md p-3"
                    >
                        <Text size="sm" className="font-semibold text-typography-900" numberOfLines={1}>
                            {doc.title}
                        </Text>
                    </Pressable>
                ))}
            </VStack>
        </ScrollView>
    );
}