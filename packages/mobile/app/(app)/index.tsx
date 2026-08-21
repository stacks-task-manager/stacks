// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    return (
        <Box style={{ paddingTop: insets.top + 24 }} className="flex-1 px-6 bg-background-0">
            <VStack space="sm">
                <Heading size="xl">Stacks</Heading>
                <Text className="text-typography-600">
                    Open the menu to browse documents, search, and more.
                </Text>
            </VStack>
        </Box>
    );
}
