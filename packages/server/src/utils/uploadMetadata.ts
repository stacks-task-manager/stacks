// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { FILES_TYPE } from "@stacks/types";

export function validUploadMetadata(fileName: string, category: string): boolean {
    const byteLength = new TextEncoder().encode(fileName).byteLength;
    return (
        byteLength > 0 &&
        byteLength <= 255 &&
        !/[\\/\u0000-\u001f\u007f]/.test(fileName) &&
        Object.values(FILES_TYPE).includes(category as FILES_TYPE)
    );
}
