// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
// Workaround for macOS GNotificationCenterDelegate conflict between canvas and sharp
/**
 * Thumbnail Service
 *
 * This service provides comprehensive thumbnail generation capabilities
 * for various file types including images, PDFs, and videos.
 *
 * Features:
 * - Image thumbnail generation with Sharp
 * - PDF thumbnail generation with pdf2pic
 * - Video thumbnail placeholders (extensible for ffmpeg)
 * - Multiple thumbnail sizes
 * - Quality control and optimization
 * - Batch processing support
 *
 * Supported formats:
 * - Images: JPEG, PNG, GIF, WebP, BMP, TIFF
 * - Documents: PDF
 * - Videos: MP4, AVI, MOV, WMV, FLV, WebM
 */

// Canvas removed to avoid Docker compilation issues
// Using Sharp for all image generation including video placeholders
import fs from "fs/promises";
import path from "path";
import pdf2pic from "pdf2pic";
import sharp from "sharp";

/**
 * Options for thumbnail generation
 */
export interface ThumbnailOptions {
    /** Target width in pixels */
    width?: number;
    /** Target height in pixels (optional, maintains aspect ratio if not provided) */
    height?: number;
    /** JPEG quality (1-100) */
    quality?: number;
    /** Whether to allow enlargement of small images */
    allowEnlargement?: boolean;
    /** Background color for transparent images */
    backgroundColor?: string;
}

/**
 * Result of thumbnail generation operation
 */
export interface ThumbnailResult {
    /** Path to the generated thumbnail */
    path: string;
    /** Width of the generated thumbnail */
    width: number;
    /** Height of the generated thumbnail */
    height: number;
    /** File size in bytes */
    size: number;
    /** Generation time in milliseconds */
    generationTime: number;
}

/**
 * Batch thumbnail generation result
 */
export interface BatchThumbnailResult {
    /** Small thumbnail generation result */
    small: ThumbnailResult | null;
    /** Large thumbnail generation result */
    large: ThumbnailResult | null;
    /** Any errors encountered during generation */
    errors: string[];
}

/**
 * Supported file type categories
 */
export enum FileTypeCategory {
    IMAGE = "image",
    DOCUMENT = "document",
    VIDEO = "video",
    UNSUPPORTED = "unsupported",
}

/**
 * Main thumbnail service class providing static methods for thumbnail generation
 */
export class ThumbnailService {
    /** Supported image MIME types for thumbnail generation */
    private static readonly SUPPORTED_IMAGE_TYPES = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/tiff",
    ];

    /** Supported document MIME types for thumbnail generation */
    private static readonly SUPPORTED_DOCUMENT_TYPES = ["application/pdf"];

    /** Supported video MIME types for thumbnail generation */
    private static readonly SUPPORTED_VIDEO_TYPES = [
        "video/mp4",
        "video/avi",
        "video/mov",
        "video/wmv",
        "video/flv",
        "video/webm",
    ];

    /** Default thumbnail options */
    private static readonly DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
        width: 300,
        height: 0, // 0 means maintain aspect ratio
        quality: 80,
        allowEnlargement: false,
        backgroundColor: "#ffffff",
    };

    /**
     * Check if thumbnail generation is supported for the given MIME type
     * @param mimeType - The MIME type to check
     * @returns True if thumbnail generation is supported
     */
    static canGeneratePreview(mimeType: string): boolean {
        if (!mimeType || typeof mimeType !== "string") {
            return false;
        }

        const normalizedMimeType = mimeType.toLowerCase().trim();
        return (
            this.SUPPORTED_IMAGE_TYPES.includes(normalizedMimeType) ||
            this.SUPPORTED_DOCUMENT_TYPES.includes(normalizedMimeType) ||
            this.SUPPORTED_VIDEO_TYPES.includes(normalizedMimeType)
        );
    }

    /**
     * Get the file type category for a given MIME type
     * @param mimeType - The MIME type to categorize
     * @returns The file type category
     */
    static getFileTypeCategory(mimeType: string): FileTypeCategory {
        if (!mimeType || typeof mimeType !== "string") {
            return FileTypeCategory.UNSUPPORTED;
        }

        const normalizedMimeType = mimeType.toLowerCase().trim();

        if (this.SUPPORTED_IMAGE_TYPES.includes(normalizedMimeType)) {
            return FileTypeCategory.IMAGE;
        } else if (this.SUPPORTED_DOCUMENT_TYPES.includes(normalizedMimeType)) {
            return FileTypeCategory.DOCUMENT;
        } else if (this.SUPPORTED_VIDEO_TYPES.includes(normalizedMimeType)) {
            return FileTypeCategory.VIDEO;
        }

        return FileTypeCategory.UNSUPPORTED;
    }

    /**
     * Generate a thumbnail for the given input file
     * @param inputPath - Path to the input file
     * @param outputPath - Path where the thumbnail should be saved
     * @param mimeType - MIME type of the input file
     * @param options - Thumbnail generation options
     * @returns Promise resolving to thumbnail result
     * @throws Error if file type is unsupported or generation fails
     */
    static async generateThumbnail(
        inputPath: string,
        outputPath: string,
        mimeType: string,
        options: ThumbnailOptions = {}
    ): Promise<ThumbnailResult> {
        const startTime = Date.now();

        try {
            // Validate inputs
            if (!inputPath || !outputPath || !mimeType) {
                throw new Error("Missing required parameters: inputPath, outputPath, or mimeType");
            }

            // Check if input file exists
            try {
                await fs.access(inputPath);
            } catch {
                throw new Error(`Input file does not exist: ${inputPath}`);
            }

            // Merge options with defaults
            const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
            const { width, height, quality, allowEnlargement, backgroundColor } = mergedOptions;

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });

            const fileCategory = this.getFileTypeCategory(mimeType);
            let generatedPath: string;

            switch (fileCategory) {
                case FileTypeCategory.IMAGE:
                    generatedPath = await this.generateImageThumbnail(
                        inputPath,
                        outputPath,
                        width,
                        height || undefined,
                        quality,
                        allowEnlargement,
                        backgroundColor
                    );
                    break;
                case FileTypeCategory.DOCUMENT:
                    generatedPath = await this.generatePdfThumbnail(
                        inputPath,
                        outputPath,
                        width,
                        height || undefined,
                        quality
                    );
                    break;
                case FileTypeCategory.VIDEO:
                    generatedPath = await this.generateVideoThumbnail(
                        inputPath,
                        outputPath,
                        width,
                        height || undefined,
                        quality
                    );
                    break;
                default:
                    throw new Error(`Unsupported file type: ${mimeType}`);
            }

            // Get file stats
            const stats = await fs.stat(generatedPath);
            // TODO: Re-enable sharp when Docker compatibility is resolved
            // const imageInfo = await sharp(generatedPath).metadata();

            return {
                path: generatedPath,
                width: width,
                height: height || Math.round(width * 0.75),
                size: stats.size,
                generationTime: Date.now() - startTime,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            console.error(`Thumbnail generation failed for ${inputPath}:`, errorMessage);
            throw new Error(`Thumbnail generation failed: ${errorMessage}`);
        }
    }

    /**
     * Generate multiple thumbnail sizes for a single input file
     * @param inputPath - Path to the input file
     * @param outputDir - Directory where thumbnails should be saved
     * @param hash - Unique hash for the file (used in filename)
     * @param mimeType - MIME type of the input file
     * @param options - Additional options for thumbnail generation
     * @returns Promise resolving to batch thumbnail result
     */
    static async generateMultipleThumbnails(
        inputPath: string,
        outputDir: string,
        hash: string,
        mimeType: string,
        options: Partial<ThumbnailOptions> = {}
    ): Promise<BatchThumbnailResult> {
        const result: BatchThumbnailResult = {
            small: null,
            large: null,
            errors: [],
        };

        // Validate inputs
        if (!inputPath || !outputDir || !hash || !mimeType) {
            const error = "Missing required parameters: inputPath, outputDir, hash, or mimeType";
            result.errors.push(error);
            return result;
        }

        // Check if file type is supported
        if (!this.canGeneratePreview(mimeType)) {
            const error = `Unsupported file type: ${mimeType}`;
            result.errors.push(error);
            return result;
        }

        try {
            // Ensure output directory exists
            await fs.mkdir(outputDir, { recursive: true });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            result.errors.push(`Failed to create output directory: ${errorMessage}`);
            return result;
        }

        // Generate small thumbnail (200px width, maintain aspect ratio)
        try {
            const smallPath = path.join(outputDir, `${hash}_small.jpg`);
            result.small = await this.generateThumbnail(inputPath, smallPath, mimeType, {
                ...options,
                width: 500,
                quality: options.quality || 85,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("Error generating small thumbnail:", errorMessage);
            result.errors.push(`Small thumbnail: ${errorMessage}`);
        }

        // Generate large thumbnail (500px width, maintain aspect ratio)
        try {
            const largePath = path.join(outputDir, `${hash}_large.jpg`);
            result.large = await this.generateThumbnail(inputPath, largePath, mimeType, {
                ...options,
                width: 1000,
                quality: options.quality || 85,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("Error generating large thumbnail:", errorMessage);
            result.errors.push(`Large thumbnail: ${errorMessage}`);
        }

        return result;
    }

    /**
     * Generate thumbnail for image files using Sharp
     * @param inputPath - Path to the input image
     * @param outputPath - Path for the output thumbnail
     * @param width - Target width in pixels
     * @param height - Target height in pixels (optional, maintains aspect ratio if not provided)
     * @param quality - JPEG quality (1-100)
     * @param allowEnlargement - Whether to allow enlarging small images
     * @param backgroundColor - Background color for transparent images
     * @returns Promise resolving to the output path
     * @throws Error if image processing fails
     */
    private static async generateImageThumbnail(
        inputPath: string,
        outputPath: string,
        width: number,
        height: number | undefined,
        quality: number,
        allowEnlargement: boolean = false,
        backgroundColor: string = "#ffffff"
    ): Promise<string> {
        try {
            const sharpInstance = sharp(inputPath);
            const metadata = await sharpInstance.metadata();

            // Configure resize options
            const resizeOptions: any = {
                width,
                fit: "inside",
                withoutEnlargement: !allowEnlargement,
                background: backgroundColor,
            };

            // Only set height if it's provided, otherwise maintain aspect ratio
            if (height) {
                resizeOptions.height = height;
            }

            // Apply resize and format conversion
            await sharpInstance
                .resize(resizeOptions)
                .jpeg({
                    quality: Math.max(1, Math.min(100, quality)),
                    progressive: true,
                    mozjpeg: true,
                })
                .toFile(outputPath);
            return outputPath;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`Failed to generate image thumbnail for ${inputPath}:`, errorMessage);

            // Provide more specific error handling for common Sharp/Docker issues
            if (errorMessage.includes("Input file contains unsupported image format")) {
                throw new Error(`Unsupported image format: ${errorMessage}`);
            } else if (errorMessage.includes("Input file is missing")) {
                throw new Error(`Input file not found: ${inputPath}`);
            } else if (errorMessage.includes("libvips")) {
                throw new Error(
                    `Image processing library error (libvips): ${errorMessage}. This may indicate a Docker configuration issue.`
                );
            }

            throw new Error(`Image thumbnail generation failed: ${errorMessage}`);
        }
    }

    /**
     * Generate thumbnail for PDF files using pdf2pic
     * @param inputPath - Path to the input PDF
     * @param outputPath - Path for the output thumbnail
     * @param width - Target width in pixels
     * @param height - Target height in pixels (optional)
     * @param quality - Image quality (1-100)
     * @returns Promise resolving to the output path
     * @throws Error if PDF processing fails
     */
    private static async generatePdfThumbnail(
        inputPath: string,
        outputPath: string,
        width: number,
        height: number | undefined,
        quality: number
    ): Promise<string> {
        try {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });

            const convertOptions: any = {
                density: Math.max(72, Math.min(300, quality * 2)), // Convert quality to density
                saveFilename: "pdf_thumbnail",
                savePath: outputDir,
                format: "jpg",
                width,
            };

            // Only set height if it's provided, otherwise maintain aspect ratio
            if (height) {
                convertOptions.height = height;
            }

            const convert = pdf2pic.fromPath(inputPath, convertOptions);

            // Convert first page to image
            const result = await convert(1, { responseType: "image" });

            if (!result || (typeof result === "object" && !("path" in result))) {
                throw new Error("PDF conversion failed - no result generated");
            }

            // Move the generated file to our desired output path
            const generatedPath = (result as any).path;

            // Check if temporary file exists
            try {
                await fs.access(generatedPath);
            } catch {
                throw new Error("PDF conversion failed - temporary file not found");
            }

            await fs.rename(generatedPath, outputPath);

            console.log(`PDF thumbnail generated: ${outputPath} (${width}x${height || "auto"})`);
            return outputPath;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`Failed to generate PDF thumbnail for ${inputPath}:`, errorMessage);
            throw new Error(`PDF thumbnail generation failed: ${errorMessage}`);
        }
    }

    /**
     * Generate thumbnail for video files (placeholder implementation)
     * @param inputPath - Path to the input video
     * @param outputPath - Path for the output thumbnail
     * @param width - Target width in pixels
     * @param height - Target height in pixels (optional)
     * @param quality - Image quality (1-100)
     * @returns Promise resolving to the output path
     * @throws Error if video processing fails
     * @note This is a placeholder implementation. For production use, integrate with ffmpeg
     */
    private static async generateVideoThumbnail(
        inputPath: string,
        outputPath: string,
        width: number,
        height: number | undefined,
        quality: number
    ): Promise<string> {
        try {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });

            // For video thumbnails, we'll create a placeholder for now
            // In a real implementation, you'd use ffmpeg or similar

            // Use default aspect ratio (16:9) if height is not provided
            const thumbnailHeight = height || Math.round((width * 9) / 16);

            // Create a simple video placeholder without Sharp
            // Generate a minimal SVG placeholder for video thumbnails
            const svgContent = `<svg width="${width}" height="${thumbnailHeight}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#2c3e50"/>
                <text x="50%" y="40%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${Math.max(
                    12,
                    width / 20
                )}">VIDEO</text>
                <text x="50%" y="60%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${Math.max(
                    10,
                    width / 25
                )}">PREVIEW</text>
                <polygon points="${width * 0.4},${thumbnailHeight * 0.7} ${width * 0.6},${
                thumbnailHeight * 0.8
            } ${width * 0.4},${thumbnailHeight * 0.9}" fill="white"/>
            </svg>`;

            await fs.writeFile(outputPath, svgContent);

            console.log(`Video thumbnail placeholder generated: ${outputPath} (${width}x${thumbnailHeight})`);
            return outputPath;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`Failed to generate video thumbnail for ${inputPath}:`, errorMessage);
            throw new Error(`Video thumbnail generation failed: ${errorMessage}`);
        }
    }

    /**
     * Get the relative path for a thumbnail file
     * @param hash - Unique hash identifier for the file
     * @param size - Thumbnail size variant
     * @returns Relative path to the thumbnail file
     */
    static getThumbnailPath(hash: string, size: "small" | "large" = "large"): string {
        if (!hash) {
            throw new Error("Hash parameter is required");
        }
        return path.join("thumbnails", `${hash}_${size}.jpg`);
    }

    /**
     * Get the absolute path for a thumbnail file
     * @param hash - Unique hash identifier for the file
     * @param size - Thumbnail size variant
     * @param baseDir - Base directory for thumbnails (optional)
     * @returns Absolute path to the thumbnail file
     */
    static getAbsoluteThumbnailPath(
        hash: string,
        size: "small" | "large" = "large",
        baseDir?: string
    ): string {
        const relativePath = this.getThumbnailPath(hash, size);
        return baseDir ? path.join(baseDir, relativePath) : path.resolve(relativePath);
    }

    /**
     * Check if a thumbnail file exists
     * @param hash - Unique hash identifier for the file
     * @param size - Thumbnail size variant
     * @param baseDir - Base directory for thumbnails (optional)
     * @returns Promise resolving to true if thumbnail exists
     */
    static async thumbnailExists(
        hash: string,
        size: "small" | "large" = "large",
        baseDir?: string
    ): Promise<boolean> {
        try {
            const thumbnailPath = this.getAbsoluteThumbnailPath(hash, size, baseDir);
            await fs.access(thumbnailPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete thumbnail files for a given hash
     * @param hash - Unique hash identifier for the file
     * @param baseDir - Base directory for thumbnails (optional)
     * @returns Promise resolving to deletion results
     */
    static async deleteThumbnails(
        hash: string,
        baseDir?: string
    ): Promise<{
        small: boolean;
        large: boolean;
        errors: string[];
    }> {
        const result = {
            small: false,
            large: false,
            errors: [] as string[],
        };

        for (const size of ["small", "large"] as const) {
            try {
                const thumbnailPath = this.getAbsoluteThumbnailPath(hash, size, baseDir);
                await fs.unlink(thumbnailPath);
                result[size] = true;
                console.log(`Deleted ${size} thumbnail: ${thumbnailPath}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Failed to delete ${size} thumbnail: ${errorMessage}`);
            }
        }

        return result;
    }
}
