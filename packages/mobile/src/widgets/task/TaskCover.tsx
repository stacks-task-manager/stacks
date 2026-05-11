// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Image } from "@/components/ui/image";

/**
 * Hero image displayed above a task card title. Matches the web
 * `TaskCover` spot in the layout.
 */
export function TaskCover({ url, height = 120 }: { url: string; height?: number }) {
    return (
        <Box style={{ height }} className="w-full overflow-hidden">
            <Image
                source={{ uri: url }}
                alt="Task cover"
                resizeMode="cover"
                className="w-full h-full"
            />
        </Box>
    );
}
