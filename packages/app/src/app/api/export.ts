// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST `/api/export` and opens the returned file blob in a new tab.
 */
import request from "./request";

export const ExportAPI = {
    /** Triggers download for PDF/Excel/JSON/HTML exports. */
    async export({
        title,
        data,
        format,
        type,
    }: {
        title?: string;
        data: any;
        format: "json" | "pdf" | "excel" | "html";
        type?: string;
    }): Promise<void> {
        try {
            // We use responseType: "blob" to handle the file download
            const blob = await request.post(
                "/api/export",
                { title, format, data, type },
                {
                    responseType: "blob",
                }
            );

            const url = URL.createObjectURL(blob as unknown as Blob);

            // Open the file in a new tab
            window.open(url, "_blank");

            // Clean up the object URL after a short delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error: any) {
            // do nothing
        }
    },
};
