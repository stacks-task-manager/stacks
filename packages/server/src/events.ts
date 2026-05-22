// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Application-wide event management system
 *
 * This module provides a centralized event emitter for handling real-time updates,
 * WebSocket connection management, and message queuing for offline clients.
 */

import type { IUpdate } from "@stacks/types";
import { EventEmitter } from "events";
import { sendMessageToUser } from "./routes/socket";
import { requestContext } from "./services/requestContext";

/** Derives `userId`/`instanceId` for outbound realtime payloads from request context or payload fallbacks. */
function resolveRealtimeEmitUserAndInstance(
    payload: Omit<IUpdate, "timestamp" | "user">
): { instanceId: string | undefined; userId: string } {
    const ctx = requestContext.getContext();
    const p = payload as Partial<IUpdate>;
    const userId =
        ctx?.user?.id ??
        (typeof p.user === "string" && p.user.length > 0 ? p.user : "system");
    const instanceId = ctx?.instanceId ?? p.instanceId;
    return { instanceId, userId };
}

/**
 * Enhanced EventEmitter with increased listener limits for high-concurrency scenarios
 */
class EnhancedEventEmitter extends EventEmitter {
    constructor() {
        super();
        // Increase max listeners to handle many WebSocket connections
        this.setMaxListeners(1000);

        // Handle uncaught errors to prevent crashes
        this.on("error", error => {
            console.error("EventEmitter error:", error);
        });
    }
}

const appEmitter = new EnhancedEventEmitter();

export { appEmitter };

export enum AppEvents {
    DATA_UPDATE = "DATA_UPDATE",
    CONNECTION_COUNT = "CONNECTION_COUNT",
    CUSTOM_MESSAGE = "CUSTOM_MESSAGE",
}

// WebSocket connection and message queue management
const activeConnections = new Set<string>();
let connectionCount = 0;

// Message queuing for offline clients
const messageQueue = new Map<string, IUpdate[]>();
const MAX_QUEUE_SIZE = 100;

/**
 * Listen to custom messages from WebSocket clients
 * @param callback - Function to handle custom messages
 * @returns Function to remove the listener
 */
export const onCustomMessage = (
    callback: (messageData: {
        connectionId: string;
        messageType?: string;
        messageData: any;
        timestamp: number;
        instanceId?: string;
        userId?: string;
    }) => void
) => {
    appEmitter.on(AppEvents.CUSTOM_MESSAGE, callback);
    return () => appEmitter.off(AppEvents.CUSTOM_MESSAGE, callback);
};

/**
 * Enhanced emit function with error handling and metrics
 */
export const emitUpdate = (payload: IUpdate) => {
    try {
        if (!payload.timestamp) {
            payload.timestamp = Date.now();
        }
        appEmitter.emit(AppEvents.DATA_UPDATE, payload);
    } catch (error) {
        console.error("Error emitting update:", error);
        appEmitter.emit("error", error);
    }
};

export const onUpdate = (handler: (payload: IUpdate) => void) => {
    appEmitter.on(AppEvents.DATA_UPDATE, handler);
};

export const onConnectionCount = (handler: (count: number) => void) => {
    appEmitter.on(AppEvents.CONNECTION_COUNT, handler);
};

export const offUpdate = (handler: (payload: IUpdate) => void) => {
    appEmitter.removeListener(AppEvents.DATA_UPDATE, handler);
};

/**
 * Registers a new WebSocket connection and updates connection count
 *
 * @param connectionId - Unique identifier for the connection
 */
export const registerConnection = (connectionId: string): void => {
    activeConnections.add(connectionId);
    connectionCount = activeConnections.size;
    console.log(`Connection registered: ${connectionId}. Total: ${connectionCount}`);
    appEmitter.emit(AppEvents.CONNECTION_COUNT, connectionCount);
};

/**
 * Unregisters a connection and cleans up associated resources
 *
 * @param connectionId - Unique identifier for the connection to remove
 */
export const unregisterConnection = (connectionId: string): void => {
    activeConnections.delete(connectionId);
    messageQueue.delete(connectionId); // Clean up queued messages
    connectionCount = activeConnections.size;
    console.log(`Connection unregistered: ${connectionId}. Total: ${connectionCount}`);
    appEmitter.emit(AppEvents.CONNECTION_COUNT, connectionCount);
};

/**
 * Queues a message for delivery to a specific connection when it comes online
 *
 * @param connectionId - Target connection identifier
 * @param payload - Message payload to queue
 */
export const queueMessage = (connectionId: string, payload: IUpdate): void => {
    if (!messageQueue.has(connectionId)) {
        messageQueue.set(connectionId, []);
    }

    const queue = messageQueue.get(connectionId)!;
    queue.push(payload);

    // Limit queue size to prevent memory issues
    if (queue.length > MAX_QUEUE_SIZE) {
        queue.shift(); // Remove oldest message
    }
};

/**
 * Retrieves and clears all queued messages for a connection
 *
 * @param connectionId - Connection identifier
 * @returns Array of queued messages
 */
export const getQueuedMessages = (connectionId: string): IUpdate[] => {
    const messages = messageQueue.get(connectionId) || [];
    messageQueue.delete(connectionId); // Clear queue after retrieval
    return messages;
};

/**
 * Send realtime update immediately
 */
export const sendRealtimeUpdate = (payload: Omit<IUpdate, "timestamp" | "user">) => {
    const { instanceId, userId } = resolveRealtimeEmitUserAndInstance(payload);
    try {
        emitUpdate({ ...payload, timestamp: Date.now(), instanceId, user: userId });
    } catch (error) {
        console.error("Error sending realtime update:", error);
    }
};

/**
 * Send a real-time update to a specific user using the existing event system
 */
export const sendRealtimeUpdateToUser = (userId: string, payload: Omit<IUpdate, "timestamp" | "user">) => {
    const { instanceId, userId: emitterUserId } = resolveRealtimeEmitUserAndInstance(payload);
    try {
        // Use the same pattern as sendRealtimeUpdate but with user targeting
        const update: IUpdate = { ...payload, timestamp: Date.now(), instanceId, user: emitterUserId };

        // Add user targeting information to the update
        const targetedUpdate = { ...update, targetUserId: userId };

        // Use the existing emitUpdate system
        emitUpdate(targetedUpdate);
    } catch (error) {
        console.error(`Error sending realtime update to user ${userId}:`, error);
    }
};

/**
 * Get current connection statistics
 */
export const getConnectionStats = () => {
    return {
        activeConnections: connectionCount,
        queuedConnections: messageQueue.size,
        totalQueuedMessages: Array.from(messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
    };
};

export default appEmitter;
