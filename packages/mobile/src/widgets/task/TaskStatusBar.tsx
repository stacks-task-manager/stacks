// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";

import { findTag, useTags } from "../hooks";

/**
 * Mobile port of the web `TaskStatusBar` — a 4px colored bar anchored to the
 * left edge of the card, painted with the task's status tag colour. Renders
 * nothing when the task has no status set.
 */
export function TaskStatusBar({ status }: { status: string | null | undefined }) {
    const { data: tags } = useTags();
    const tag = findTag(tags, status);
    if (!tag) return null;

    return (
        <Box
            style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: 4,
                backgroundColor: tag.color,
            }}
            className="rounded-l-md"
        />
    );
}
