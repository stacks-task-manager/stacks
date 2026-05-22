// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

function fmt(d: Date | string | null | undefined): string | null {
    if (!d) return null;
    try {
        return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
        return null;
    }
}

/**
 * Small date chip — renders `start → due` when a start date is present,
 * `due` alone otherwise. Turns red when the due date is in the past and the
 * task isn't done. Mobile port of the web `TaskDate`.
 */
export function TaskDate({
    startdate,
    duedate,
    done,
}: {
    startdate: Date | string | null | undefined;
    duedate: Date | string | null | undefined;
    done?: boolean;
}) {
    if (!startdate && !duedate) return null;
    const start = fmt(startdate);
    const due = fmt(duedate);
    const overdue = !done && duedate ? new Date(duedate).getTime() < Date.now() : false;

    return (
        <Box
            className={`px-1.5 py-0.5 rounded-full ${overdue ? "bg-error-100" : "bg-background-100"}`}
        >
            <Text
                size="xs"
                className={`font-medium ${overdue ? "text-error-700" : "text-typography-700"}`}
            >
                {start && due ? `${start} → ${due}` : (due ?? start ?? "")}
            </Text>
        </Box>
    );
}
