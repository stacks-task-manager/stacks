// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchStacks } from "../../../api/endpoints";
import { OptionsModal } from "./OptionsModal";
import { ValuePill } from "./ValuePill";

export function StackSelect({
    projectId,
    value,
    onChange,
    disabled,
}: {
    projectId: string;
    value: string | null | undefined;
    onChange: (stackId: string) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const { data: stacks } = useQuery({
        queryKey: ["stacks", projectId],
        queryFn: () => fetchStacks(projectId),
        staleTime: 60 * 1000,
    });

    const current = (stacks ?? []).find(s => s.id === value);

    return (
        <>
            <ValuePill
                label={current?.title ?? null}
                placeholder="No column"
                onPress={() => setOpen(true)}
                disabled={disabled}
            />
            <OptionsModal
                visible={open}
                title="Move to column"
                selectedIds={current ? [current.id] : []}
                options={(stacks ?? []).map(s => ({ id: s.id, label: s.title }))}
                onSelect={id => {
                    onChange(id);
                    setOpen(false);
                }}
                onClose={() => setOpen(false)}
            />
        </>
    );
}
