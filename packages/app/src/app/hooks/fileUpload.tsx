// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * FileUpload hooks and selectors.
 */
import React, { useCallback, useRef, useEffect } from "react";
import { sha256 } from 'hash-wasm';
import { FilesAPI } from '../api/files';
import { FILES_TYPE, IAttachment } from '@stacks/types';
import { OverlayToaster, ProgressBar, Toaster, ToastProps } from '@blueprintjs/core';
import { Grid } from 'app/components/common';

/**
 * Calculate file hash for resumable uploads using sha.js (works in all environments)
 */
const calculateHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    const hash = await sha256(uint8Array);
    return hash;
};

export interface IUploadConfig {
    allowMultiple?: boolean;
}

export interface IFilePickerControls {
    onProgress: (callback: (progress: number) => void) => void;
    onCancel: (callback: () => void) => void;
}

/**
 * Options for the pickFiles function
 * @interface IPickFilesOptions
 */
export interface IPickFilesOptions {
    /** The ID of the record to associate uploaded files with */
    recordId: string;
    /** Optional file type classification for the uploaded files */
    type?: FILES_TYPE;
    /** Optional callback function called when files are successfully uploaded */
    onUploaded?: (uploadedFiles: IAttachment[]) => void;
    /** Optional callback function called before upload starts, receives array of file names */
    onBeforeUpload?: (fileNames: string[]) => Promise<void> | void;
    /**
     * Optional file type restrictions using HTML input accept attribute format
     * @example
     * ```typescript
     * // Only allow image files
     * { acceptedFileTypes: 'image/*' }
     * 
     * // Only allow specific extensions
     * { acceptedFileTypes: '.pdf,.doc,.docx' }
     * 
     * // Allow multiple MIME types
     * { acceptedFileTypes: 'image/jpeg,image/png,application/pdf' }
     * 
     * // Allow all files (default behavior)
     * { acceptedFileTypes: '*\/*' } // or omit this property
     * ```
     */
    acceptedFileTypes?: string;
}

export interface IUploadHook {
    pickFiles: (options: IPickFilesOptions) => IFilePickerControls;
    upload: (files: File[]) => Promise<void>;
    cancelUpload: () => void;
    removeByAttachment: (attachmentId: string) => Promise<IAttachment[]>;
    removeByRecord: (recordId: string, fileType?: FILES_TYPE) => Promise<IAttachment[]>;
}

/**
 * Custom hook for file upload with file selection and progress tracking
 * Uses streaming upload for all file sizes for consistency and better performance
 */
export const useUpload = (config?: IUploadConfig): IUploadHook => {
    const { allowMultiple = false } = config || {};

    // State management refs
    const progressRef = useRef(0);
    const onProgressRef = useRef<((progress: number) => void) | null>(null);
    const onCancelRef = useRef<(() => void) | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Upload configuration refs
    const uploadType = useRef<FILES_TYPE | undefined>(undefined);
    const onUploadedRef = useRef<((uploadedFiles: IAttachment[]) => void) | null>(null);
    const onBeforeUploadRef = useRef<((fileNames: string[]) => Promise<void> | void) | null>(null);
    const recordIdRef = useRef<string | null>(null);

    // Toast notification refs
    const progressToast = useRef<Toaster | undefined>();
    const toastKey = useRef<string | undefined>();

    useEffect(() => {
        (async () => {
            progressToast.current = await OverlayToaster.create({ position: "bottom" });
        })();
    }, []);

    // Create hidden file input on mount
    useEffect(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = allowMultiple;
        input.style.display = 'none';
        input.accept = '*/*'; // Will be updated when pickFiles is called

        input.addEventListener('change', async (event) => {
            const target = event.target as HTMLInputElement;
            const files = target.files;
            if (files && files.length > 0) {
                await upload(Array.from(files));
            }
            // Reset input value to allow selecting the same file again
            target.value = '';
        });

        document.body.appendChild(input);
        fileInputRef.current = input;

        return () => {
            if (fileInputRef.current) {
                document.body.removeChild(fileInputRef.current);
            }
        };
    }, [allowMultiple]);

    /**
     * Opens a file picker dialog for selecting files to upload
     * @param options - Configuration options for file picking
     * @returns Controls for handling upload progress and cancellation
     * 
     * @example
     * // Basic usage
     * const controls = pickFiles({ recordId: 'record123' });
     * 
     * @example
     * // With file type restrictions and callback
     * const controls = pickFiles({
     *   recordId: 'record123',
     *   type: FILES_TYPE.DOCUMENT,
     *   acceptedFileTypes: '.pdf,.doc,.docx',
     *   onUploaded: (files) => console.log('Uploaded:', files)
     * });
     * 
     * @example
     * // Only allow images
     * const controls = pickFiles({
     *   recordId: 'record123',
     *   acceptedFileTypes: 'image/*'
     * });
     */
    const pickFiles = useCallback((options: IPickFilesOptions): IFilePickerControls => {
        if (!fileInputRef.current) {
            throw new Error('File input not initialized');
        }

        const { recordId, type, onUploaded, onBeforeUpload, acceptedFileTypes } = options;
        recordIdRef.current = recordId;
        uploadType.current = type;
        onUploadedRef.current = onUploaded || null;
        onBeforeUploadRef.current = onBeforeUpload || null;

        // Update file input accept attribute to restrict file types
        // Uses HTML input accept attribute format (MIME types, extensions, wildcards)
        if (acceptedFileTypes) {
            fileInputRef.current.accept = acceptedFileTypes;
        } else {
            fileInputRef.current.accept = '*/*'; // Allow all file types by default
        }

        fileInputRef.current.click();

        return {
            onProgress: (callback: (progress: number) => void) => {
                onProgressRef.current = callback;
            },
            onCancel: (callback: () => void) => {
                onCancelRef.current = () => {
                    cancelUpload();
                    callback();
                };
            }
        };
    }, []);

    // Helper functions
    const checkExistingFile = async (hash: string, recordId: string, fileName: string): Promise<IAttachment | null> => {
        try {
            const existingAttachment = await FilesAPI.checkExistingFile(
                hash,
                recordId,
                uploadType.current ?? FILES_TYPE.FILE,
                fileName
            );

            return existingAttachment;
        } catch {
            return null;
        }
    };

    const updateProgress = (progress: number, fileName?: string): void => {
        progressRef.current = progress;
        onProgressRef.current?.(progress);

        if (!toastKey.current) {
            toastKey.current = progressToast.current?.show(renderProgressBar(0, fileName));
        } else {
            progressToast.current?.show(renderProgressBar(progress, fileName), toastKey.current);
        }
    };

    const uploadSingleFile = async (
        file: File,
        recordId: string,
        fileIndex: number,
        totalFiles: number
    ): Promise<IAttachment> => {
        // Use streaming upload for all files for consistency and better performance
        return await FilesAPI.upload(
            file,
            recordId,
            uploadType.current ?? FILES_TYPE.FILE,
            (fileProgress) => {
                const overallProgress = ((fileIndex / totalFiles) + (fileProgress / 100 / totalFiles)) * 100;
                updateProgress(overallProgress, file.name);
            }
        );
    };

    const updateCompletedProgress = (fileIndex: number, totalFiles: number, fileName?: string): void => {
        const completedProgress = ((fileIndex + 1) / totalFiles) * 100;
        updateProgress(completedProgress, fileName);
    };

    const renderProgressBar = (progress: number, fileName?: string): ToastProps => {
        return {
            icon: "cloud-upload",
            message: (
                <Grid gap={10}>
                    <div>{fileName}</div>
                    <ProgressBar value={progress / 100} stripes={false} />
                </Grid>
            ),
            onDismiss: (didTimeoutExpire: boolean) => {
                !didTimeoutExpire && cancelUpload();
            },
            timeout: progress < 100 ? 0 : 2000,
        }
    }

    const upload = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        const currentRecordId = recordIdRef.current;
        if (!currentRecordId) {
            throw new Error('No recordId provided for upload');
        }

        // Call onBeforeUpload callback with file names and wait for completion
        const fileNames = files.map(file => file.name);
        const onBeforeUploadCallback = onBeforeUploadRef.current;
        if (onBeforeUploadCallback) {
            await onBeforeUploadCallback(fileNames);
        }

        try {
            updateProgress(0);
            abortControllerRef.current = new AbortController();

            const uploadedFiles: IAttachment[] = [];
            const totalFiles = files.length;

            for (let i = 0; i < files.length; i++) {
                if (abortControllerRef.current?.signal.aborted) {
                    throw new Error('Upload cancelled');
                }

                const file = files[i];
                const hash = await calculateHash(file);

                // Check if file already exists to avoid duplicate uploads
                const existingAttachment = await checkExistingFile(hash, currentRecordId, file.name);
                if (existingAttachment) {
                    uploadedFiles.push(existingAttachment);
                    updateCompletedProgress(i, totalFiles, file.name);
                    continue;
                }



                // Upload file using streaming (works for all file sizes)
                const result = await uploadSingleFile(file, currentRecordId, i, totalFiles);
                uploadedFiles.push(result);
                updateCompletedProgress(i, totalFiles, file.name);
            }

            // Complete upload process
            updateProgress(100);

            // Execute callback and clean up
            const callbackToUse = onUploadedRef.current;
            callbackToUse?.(uploadedFiles);
            onUploadedRef.current = null;

        } catch (error) {
            progressRef.current = 0;
            onProgressRef.current?.(0);
            throw error;
        }
    }, []);

    const cancelUpload = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        updateProgress(0);
        onCancelRef.current?.();
    }, []);

    const removeByAttachment = useCallback(async (attachmentId: string) => {
        try {
            const deletedAttachment = await FilesAPI.deleteByAttachment(attachmentId);
            return [deletedAttachment];
        } catch (error) {
            throw error;
        }
    }, []);

    const removeByRecord = useCallback(async (recordId: string, fileType?: FILES_TYPE) => {
        try {
            const deletedAttachments = await FilesAPI.deleteByRecord(recordId, fileType);
            return deletedAttachments;
        } catch (error) {
            throw error;
        }
    }, []);

    return {
        pickFiles,
        upload,
        cancelUpload,
        removeByAttachment,
        removeByRecord,
    };
};