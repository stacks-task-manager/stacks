// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { RECORDTYPE } from "@stacks/types";

import { fetchDocuments } from "../../../src/api/endpoints";
import { NotepadView } from "../../../src/views/NotepadView";
import { ProjectView } from "../../../src/views/ProjectView";

export default function DocumentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data, isLoading } = useQuery({
        queryKey: ["documents"],
        queryFn: fetchDocuments,
    });

    const node = data?.documents.find(d => d.id === id);

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (!node) {
        return (
            <Box className="flex-1 p-6 items-center justify-center">
                <Text>Document not found.</Text>
            </Box>
        );
    }

    switch (node.type) {
        case RECORDTYPE.PROJECT:
            return <ProjectView projectId={id} title={node.title} />;
        case RECORDTYPE.NOTEPAD:
            return <NotepadView notepadId={id} title={node.title} />;
        default:
            return (
                <Box className="flex-1 p-6 items-center justify-center">
                    <Text className="text-typography-600">
                        This document type is not supported on mobile yet: {node.type}
                    </Text>
                </Box>
            );
    }
}
