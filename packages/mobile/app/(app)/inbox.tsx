// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";

import { Box } from "@/components/ui/box";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

import { fetchDocuments, findInboxProjectId } from "../../src/api/endpoints";
import { ProjectView } from "../../src/views/ProjectView";

export default function InboxScreen() {
    const { data: inboxId, isLoading } = useQuery({
        queryKey: ["inbox-project"],
        queryFn: async () => {
            const { documents } = await fetchDocuments();
            return findInboxProjectId(documents);
        },
    });

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (!inboxId) {
        return (
            <Box className="flex-1 justify-center items-center p-6">
                <Text className="text-typography-700">
                    No inbox project found in this workspace.
                </Text>
            </Box>
        );
    }

    return (
        <ProjectView projectId={inboxId} title="Inbox" allowDelete={false} />
    );
}
