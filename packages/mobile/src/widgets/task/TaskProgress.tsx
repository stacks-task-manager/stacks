// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

/**
 * Compact progress indicator — a small filled bar with the percentage next
 * to it. Stands in for the web's CircularProgress without requiring
 * react-native-svg. Hidden when progress is zero/undefined.
 */
export function TaskProgress({ progress }: { progress: number | null | undefined }) {
    if (!progress || progress <= 0) return null;
    const pct = Math.max(0, Math.min(100, Math.round(progress)));
    return (
        <HStack space="xs" className="items-center">
            <Box
                style={{ width: 36, height: 6 }}
                className="rounded-full bg-background-200 overflow-hidden"
            >
                <Box
                    style={{ width: `${pct}%`, height: "100%" }}
                    className="bg-primary-500"
                />
            </Box>
            <Text size="2xs" className="text-typography-700">
                {pct}%
            </Text>
        </HStack>
    );
}
