// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared Axios client: date serialization, instance header, unwraps `data`, toast on errors.
 */
import { Intent, ToastProps } from "@blueprintjs/core";
import axios, { AxiosRequestConfig } from "axios";
import qs from "qs";

/** Recursively converts ISO-like strings in JSON to `Date` instances. */
const transformDates = (obj: any): any => {
    if (obj === null || typeof obj !== "object") {
        // Check if it's an ISO date string or our custom format (YYYY-MM-DD HH:mm:ss)
        if (
            typeof obj === "string" &&
            (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj) ||
                /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(obj))
        ) {
            return new Date(obj);
        }

        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(transformDates);
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = transformDates(value);
    }
    return result;
};

const instance = axios.create({
    paramsSerializer: params => qs.stringify(params, { arrayFormat: "repeat" }),
});

instance.interceptors.request.use(
    config => {
        // Add instance ID header to all requests
        if (window.updatePoller && window.updatePoller.instanceId) {
            config.headers = config.headers || {};
            config.headers["X-Instance-ID"] = window.updatePoller.instanceId;
        }

        // Only process POST and PATCH requests
        if (config.method === "post" || config.method === "patch") {
            // Skip processing FormData objects (for multipart uploads)
            if (config.data && typeof config.data === "object" && !(config.data instanceof FormData)) {
                // Apply both transformations in a single pass
                const transformRequestData = (obj: any): any => {
                    if (obj === undefined) {
                        return null;
                    }

                    if (obj === null) {
                        return obj;
                    }

                    if (obj instanceof Date) {
                        return obj.toISOString();
                    }

                    if (Array.isArray(obj)) {
                        return obj.map(transformRequestData);
                    }

                    if (typeof obj === "object" && obj.constructor === Object) {
                        const result: any = {};
                        for (const [key, value] of Object.entries(obj)) {
                            result[key] = transformRequestData(value);
                        }
                        return result;
                    }

                    return obj;
                };

                config.data = transformRequestData(config.data);
            }
        }

        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

instance.interceptors.response.use(
    response => {
        // If the request expects a blob (like for file downloads), return it directly
        if (response.config.responseType === "blob") {
            return response.data;
        }

        const { data } = response.data;
        const transformedData = transformDates(data);
        return transformedData ?? null;
    },
    async error => {
        if (error.response) {
            if (error.status === 401) {
                window.location.href = "/login";
            }
            if (error.status === 417) {
                // this is used when uploading a file and checking for the file progress
                return;
            }

            if (!error.config?.silent) {
                const {
                    response: { data, statusText },
                } = error;
                let parsedData = data;
                if (typeof Blob !== "undefined" && parsedData instanceof Blob) {
                    const text = await parsedData.text();
                    try {
                        parsedData = JSON.parse(text);
                    } catch {
                        parsedData = { message: text };
                    }
                }
                const message =
                    data.message || parsedData?.message || statusText || error.message || "Unknown error";

                const options: ToastProps = {
                    message,
                    intent: error.status === 404 ? Intent.WARNING : Intent.DANGER,
                    icon: "error",
                    timeout: error.status === 404 ? 3000 : 30000,
                };

                window.toaster.show(options);
            }
        }

        return Promise.reject(error);
    }
);

/** Axios config extended with `silent` to skip error toasts. */
export interface SilencedAxiosRequestConfig extends AxiosRequestConfig {
    silent?: boolean;
}

export default instance;
