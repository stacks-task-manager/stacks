// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Attachments: listing, streaming upload, dedupe check, delete, download.
 */
import { FILES_TYPE, IAttachment } from "@stacks/types";
import request from "./request";

export const FilesAPI = {
    /** Lists attachments for a record and category. */
    async load(recordId: string, type: FILES_TYPE): Promise<IAttachment[]> {
        return request.get(`/api/files/attachments/${recordId}?type=${type}`);
    },

    /** XHR upload with optional progress callback (streaming endpoint). */
    async upload(
        file: File,
        recordId: string,
        type: FILES_TYPE,
        onProgress?: (progress: number) => void
    ): Promise<IAttachment> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Set up progress tracking
            xhr.upload.addEventListener("progress", event => {
                if (event.lengthComputable && onProgress) {
                    const progress = (event.loaded / event.total) * 100;
                    onProgress(progress);
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        resolve(result.data);
                    } catch (error) {
                        reject(new Error("Invalid response format"));
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });

            xhr.addEventListener("error", () => {
                reject(new Error("Upload failed"));
            });

            // Set up the request
            xhr.open("POST", "/api/files/upload");

            // Set headers with file metadata
            xhr.setRequestHeader("x-file-name", file.name);
            xhr.setRequestHeader("x-file-type", file.type);
            xhr.setRequestHeader("x-record-id", recordId);
            xhr.setRequestHeader("x-file-category", type);

            // Send the file as a stream
            xhr.send(file);
        });
    },

    /** Returns existing attachment for content hash or null on 404. */
    async checkExistingFile(
        hash: string,
        recordId: string,
        type: FILES_TYPE,
        originalName: string
    ): Promise<IAttachment | null> {
        try {
            return await request.post(`/api/files/check-existing`, {
                hash,
                recordId,
                type,
                originalName,
            });
        } catch (error: any) {
            // If file doesn't exist, API will return 404, which we handle as null
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    /** Deletes one attachment by id. */
    async deleteByAttachment(attachmentId: string): Promise<IAttachment> {
        return request.delete(`/api/files/attachment/${attachmentId}`);
    },

    /** Deletes all attachments on a record (optional type filter). */
    async deleteByRecord(recordId: string, type?: FILES_TYPE): Promise<IAttachment[]> {
        return request.delete(`/api/files/record/${recordId}/${type}`);
    },

    /** Browser `fetch` download as `Blob` (cookies included). */
    async download(attachmentId: string): Promise<Blob> {
        const response = await fetch(`/api/files/download/${attachmentId}`, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Failed to download file");
        }

        return response.blob();
    },
};
