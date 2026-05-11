// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export default function HomeScreen() {
    return (
        <Box className="flex-1 px-6 justify-center bg-background-0">
            <VStack space="sm">
                <Heading size="xl">Stacks</Heading>
                <Text className="text-typography-600">
                    Open the menu to browse documents, search, and more.
                </Text>
            </VStack>
        </Box>
    );
}
