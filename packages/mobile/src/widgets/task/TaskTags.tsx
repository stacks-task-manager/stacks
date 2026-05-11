// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { TAGTYPE } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

import { useTags } from "../hooks";

/**
 * Inline row of tag chips. Looks up tag objects from the cached tags list
 * and renders only regular TAGs (not status). Mobile port of the web
 * `Tags` component's read-only usage in TaskCard.
 */
export function TaskTags({ tags, max = 4 }: { tags: string[]; max?: number }) {
    const { data: allTags } = useTags();
    if (!tags?.length || !allTags) return null;

    const resolved = tags
        .map(id => allTags.find(t => t.id === id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .filter(t => t.type === TAGTYPE.TAG);

    if (!resolved.length) return null;

    const visible = resolved.slice(0, max);
    const extra = resolved.length - visible.length;

    return (
        <HStack space="xs" className="flex-wrap">
            {visible.map(tag => (
                <Box
                    key={tag.id}
                    style={{ backgroundColor: tag.color + "22", borderColor: tag.color }}
                    className="px-1.5 py-0.5 rounded-full border"
                >
                    <Text size="2xs" numberOfLines={1} style={{ color: tag.color }} className="font-semibold">
                        {tag.title}
                    </Text>
                </Box>
            ))}
            {extra > 0 ? (
                <Box className="px-1.5 py-0.5 rounded-full bg-background-200">
                    <Text size="2xs" className="font-semibold text-typography-700">
                        +{extra}
                    </Text>
                </Box>
            ) : null}
        </HStack>
    );
}
