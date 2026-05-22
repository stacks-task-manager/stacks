// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { IPerson } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";

import { colorForId } from "../../components/UserAvatar";
import { findPerson, usePeople } from "../hooks";

const AVATAR_SIZE = 22;
const AVATAR_OVERLAP = 8;

function initials(person: IPerson): string {
    const first = person.firstName?.trim()?.[0] ?? "";
    const last = person.lastName?.trim()?.[0] ?? "";
    const joined = `${first}${last}`.toUpperCase();
    if (joined) return joined;
    return (person.email?.[0] ?? "?").toUpperCase();
}

function Avatar({ person }: { person: IPerson }) {
    const bg = colorForId(person.id);
    const avatar = person.avatar ?? undefined;
    return (
        <Box
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, backgroundColor: bg }}
            className="rounded-full items-center justify-center border-2 border-background-0 overflow-hidden"
        >
            {avatar ? (
                <Image source={{ uri: avatar }} alt="" className="w-full h-full" />
            ) : (
                <Text className="text-white font-bold" size="2xs">
                    {initials(person)}
                </Text>
            )}
        </Box>
    );
}

/**
 * Avatar stack for task assignees. Shows up to `max` overlapping avatars and
 * a "+N" counter for any overflow. Mobile port of the web `TaskAssignees`.
 */
export function TaskAssignees({ assignees, max = 3 }: { assignees: string[]; max?: number }) {
    const { data: people } = usePeople();
    if (!assignees.length) return null;

    const resolved = assignees
        .map(id => findPerson(people, id))
        .filter((p): p is IPerson => Boolean(p));
    const visible = resolved.slice(0, max);
    const extra = Math.max(0, resolved.length - visible.length);

    if (!visible.length && extra === 0) return null;

    return (
        <HStack className="items-center">
            {visible.map((p, i) => (
                <Box key={p.id} style={{ marginLeft: i === 0 ? 0 : -AVATAR_OVERLAP }}>
                    <Avatar person={p} />
                </Box>
            ))}
            {extra > 0 ? (
                <Box
                    style={{ marginLeft: -AVATAR_OVERLAP, height: AVATAR_SIZE }}
                    className="px-1.5 rounded-full bg-background-200 items-center justify-center border-2 border-background-0"
                >
                    <Text size="2xs" className="font-bold text-typography-800">
                        +{extra}
                    </Text>
                </Box>
            ) : null}
        </HStack>
    );
}
