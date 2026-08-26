// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * POST `/api/export` and downloads the returned attachment.
 */
import type { ExportRequest } from "@stacks/types";
import request from "./request";

function attachmentFilename(contentDisposition: string | undefined): string {
    const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    if (encoded) {
        try {
            return decodeURIComponent(encoded);
        } catch {
            // Fall through to the ASCII filename.
        }
    }
    return contentDisposition?.match(/filename="([^"]+)"/i)?.[1] ?? "export";
}

export const ExportAPI = {
    /** Triggers download for PDF/Excel/JSON/HTML exports. */
    async export(exportRequest: ExportRequest): Promise<void> {
        const response = await request.post<Blob>("/api/export", exportRequest, { responseType: "blob" });
        const url = URL.createObjectURL(response.data);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = attachmentFilename(response.headers["content-disposition"]);
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    },
};
