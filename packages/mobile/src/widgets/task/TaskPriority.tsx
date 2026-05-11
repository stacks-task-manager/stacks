// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { PRIORITY } from "@stacks/types";

const PRIORITY_STYLES: Record<PRIORITY, { label: string; color: string; bg: string }> = {
    [PRIORITY.NONE]: { label: "", color: "#666", bg: "#eee" },
    [PRIORITY.LOW]: { label: "↓ Low", color: "#2d7a46", bg: "#e4f4ea" },
    [PRIORITY.MEDIUM]: { label: "− Med", color: "#8a6a00", bg: "#fbf2d8" },
    [PRIORITY.HIGH]: { label: "↑ High", color: "#aa3e00", bg: "#fde5d1" },
    [PRIORITY.CRITICAL]: { label: "⇈ Critical", color: "#a51616", bg: "#fbd9d9" },
};

/**
 * Priority pill; hidden for `null` / `NONE`. Mobile port of the web
 * `PriorityPicker` target area.
 */
export function TaskPriority({ priority }: { priority: PRIORITY | null | undefined }) {
    if (!priority || priority === PRIORITY.NONE) return null;
    const style = PRIORITY_STYLES[priority];
    return (
        <Box style={{ backgroundColor: style.bg }} className="px-1.5 py-0.5 rounded-full">
            <Text size="xs" style={{ color: style.color }} className="font-semibold">
                {style.label}
            </Text>
        </Box>
    );
}
