// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

/**
 * Tiny glyph+count badge. Used for comments and attachments counts in the
 * card footer. Hidden when `count` is 0.
 */
export function TaskFooterCount({
    glyph,
    count,
}: {
    glyph: string;
    count: number | null | undefined;
}) {
    if (!count) return null;
    return (
        <HStack className="items-center" space="xs">
            <Text size="xs" className="text-typography-500">
                {glyph}
            </Text>
            <Text size="xs" className="font-semibold text-typography-500">
                {count}
            </Text>
        </HStack>
    );
}
