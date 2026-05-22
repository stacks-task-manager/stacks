// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useState } from "react";

import { PRIORITY } from "@stacks/types";

import { OptionsModal } from "./OptionsModal";
import { ValuePill } from "./ValuePill";

const PRIORITY_COLORS: Record<PRIORITY, string | undefined> = {
    [PRIORITY.NONE]: undefined,
    [PRIORITY.LOW]: "#0050b3",
    [PRIORITY.MEDIUM]: "#d9822b",
    [PRIORITY.HIGH]: "#d9534f",
    [PRIORITY.CRITICAL]: "#8b0000",
};

const PRIORITY_LABELS: Record<PRIORITY, string> = {
    [PRIORITY.NONE]: "None",
    [PRIORITY.LOW]: "Low",
    [PRIORITY.MEDIUM]: "Medium",
    [PRIORITY.HIGH]: "High",
    [PRIORITY.CRITICAL]: "Critical",
};

export function PrioritySelect({
    value,
    onChange,
    disabled,
}: {
    value: PRIORITY | null | undefined;
    onChange: (value: PRIORITY) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const current = (value ?? PRIORITY.NONE) as PRIORITY;

    return (
        <>
            <ValuePill
                label={PRIORITY_LABELS[current]}
                color={PRIORITY_COLORS[current]}
                onPress={() => setOpen(true)}
                disabled={disabled}
            />
            <OptionsModal
                visible={open}
                title="Priority"
                selectedIds={[current]}
                options={(Object.values(PRIORITY) as PRIORITY[]).map(p => ({
                    id: p,
                    label: PRIORITY_LABELS[p],
                    color: PRIORITY_COLORS[p],
                }))}
                onSelect={id => {
                    onChange(id as PRIORITY);
                    setOpen(false);
                }}
                onClose={() => setOpen(false)}
            />
        </>
    );
}
