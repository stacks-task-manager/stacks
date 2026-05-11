// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Avatar,
    AvatarFallbackText,
    AvatarImage,
} from "@/components/ui/avatar";

/** Deterministic subtle colour per id; used for avatar bg when no image. */
export function colorForId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 45%, 55%)`;
}

export function UserAvatar({
    id,
    avatar,
    initials,
    size = 32,
}: {
    id: string;
    avatar?: string | null;
    initials: string;
    size?: number;
}) {
    const bg = colorForId(id);
    return (
        <Avatar
            style={{ width: size, height: size, backgroundColor: bg }}
            className="overflow-hidden rounded-full items-center justify-center"
        >
            <AvatarFallbackText className="text-white font-bold text-xs">
                {initials}
            </AvatarFallbackText>
            {avatar ? <AvatarImage source={{ uri: avatar }} alt="" /> : null}
        </Avatar>
    );
}
