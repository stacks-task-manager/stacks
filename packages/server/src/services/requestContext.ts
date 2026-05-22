// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Request Context Service
 *
 * Provides request-scoped access to user context without needing to pass
 * the user object through every function call. Uses AsyncLocalStorage to
 * maintain context isolation between concurrent requests.
 */

import { AsyncLocalStorage } from "async_hooks";
import { translate } from "@stacks/translations";
import { Errors } from "../errors";
import type { User } from "../types/user";
import { IRole } from "@stacks/types";

interface RequestContext {
    user: User;
    instanceId: string;
    role: IRole;
    requestId: string;
    timestamp: number;
}

class RequestContextService {
    private static instance: RequestContextService;
    private asyncLocalStorage: AsyncLocalStorage<RequestContext>;

    private constructor() {
        this.asyncLocalStorage = new AsyncLocalStorage<RequestContext>();
    }

    public static getInstance(): RequestContextService {
        if (!RequestContextService.instance) {
            RequestContextService.instance = new RequestContextService();
        }
        return RequestContextService.instance;
    }

    /**
     * Run a function within a request context
     * @param context - The request context to set
     * @param fn - The function to run within the context
     * @returns The result of the function
     */
    public run<T>(context: RequestContext, fn: () => T): T {
        return this.asyncLocalStorage.run(context, fn);
    }

    /**
     * Get the current request context
     * @returns The current request context or undefined if not in a request context
     */
    public getContext(): RequestContext | undefined {
        return this.asyncLocalStorage.getStore();
    }

    /**
     * Get the current user from the request context
     * @returns The current user
     * @throws Error if no user context is available
     */
    public getCurrentUser(): User {
        const context = this.getContext();
        if (!context || !context.user) {
            throw Errors.internal(translate("No user context available"));
        }
        return context.user;
    }

    public getInstanceId(): string {
        const context = this.getContext();
        if (!context || !context.instanceId) {
            throw Errors.internal(translate("No instance ID context available"));
        }
        return context.instanceId;
    }

    /**
     * Get the current role from the request context
     * @returns The current role
     * @throws Error if no role context is available
     */
    public getCurrentRole(): IRole {
        const context = this.getContext();
        if (!context || !context.role) {
            throw Errors.internal(translate("No role context available"));
        }
        return context.role;
    }

    /**
     * Get the current request ID
     * @returns The current request ID
     * @throws Error if no request context is available
     */
    public getRequestId(): string {
        const context = this.getContext();
        if (!context) {
            throw Errors.internal(translate("No request context available"));
        }
        return context.requestId;
    }

    /**
     * Check if we're currently in a request context
     * @returns True if in a request context, false otherwise
     */
    public hasContext(): boolean {
        return this.getContext() !== undefined;
    }
}

// Export singleton instance
export const requestContext = RequestContextService.getInstance();

// Export types
export type { RequestContext };
