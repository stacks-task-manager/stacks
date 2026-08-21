// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Shared drop-zone file extraction. Maps a drag/drop event to files with
 * `path` resolved via the Electron-exposed `window.getPathForFile`.
 * Duplicated previously in TaskCard and TaskDetails.
 */
import { DropEvent } from "react-dropzone";

export const getFilesFromEvent = async (event: DropEvent): Promise<File[]> => {
    const { dataTransfer } = event as React.DragEvent<HTMLElement>;

    const files = Array.from(dataTransfer.files).map(file => ({
        ...file,
        path: window.getPathForFile(file),
    }));

    return files as File[];
};
