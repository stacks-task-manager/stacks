// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMemo, useState } from "react";

import { TAGTYPE } from "@stacks/types";

import { findTag, useTags } from "../../hooks";
import { OptionsModal } from "./OptionsModal";
import { ValuePill } from "./ValuePill";

export function StatusSelect({
    value,
    onChange,
    disabled,
}: {
    value: string | null | undefined;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const { data: tags } = useTags();

    const statuses = useMemo(
        () => (tags ?? []).filter(t => t.type === TAGTYPE.STATUS),
        [tags]
    );

    const current = findTag(tags, value ?? undefined);

    return (
        <>
            <ValuePill
                label={current?.title ?? null}
                color={current?.color}
                placeholder="No status"
                onPress={() => setOpen(true)}
                disabled={disabled}
            />
            <OptionsModal
                visible={open}
                title="Status"
                selectedIds={current ? [current.id] : []}
                options={statuses.map(s => ({ id: s.id, label: s.title, color: s.color }))}
                onSelect={id => {
                    onChange(id);
                    setOpen(false);
                }}
                onClose={() => setOpen(false)}
            />
        </>
    );
}
