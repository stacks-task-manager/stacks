// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Application-wide event management system
 *
 * This module provides a centralized event emitter for handling real-time updates,
 * WebSocket connection management, and message queuing for offline clients.
 */

import { POLLINGACTIONS, POLLINGTYPE } from "@stacks/types";
import type { IUpdate, IPermissions } from "@stacks/types";
import type { RealtimeAudience } from "./utils/realtimeAudience";
import { EventEmitter } from "events";
import { sendMessageToUser } from "./routes/socket";
import type { WebSocketMessage } from "./routes/socket";
import { requestContext } from "./services/requestContext";

/**
 * Derives the trusted emitter identity for outbound realtime payloads. The tenant
 * is read from server context only — never from a payload a client can supply —
 * because it gates which recipients may receive the frame.
 */
function resolveRealtimeEmitContext(payload: Omit<IUpdate, "timestamp" | "user">): {
    instanceId: string | undefined;
    tenant: string | undefined;
    userId: string;
} {
    const ctx = requestContext.getContext();
    const p = payload as Partial<IUpdate>;
    const userId = ctx?.user?.id ?? (typeof p.user === "string" && p.user.length > 0 ? p.user : "system");
    const instanceId = ctx?.instanceId ?? p.instanceId;
    const tenant = ctx?.user?.tenant;
    return { instanceId, tenant, userId };
}

/** Builds the trusted audience for one event; a missing tenant fails closed. */
const buildRealtimeAudience = (
    tenant: string | undefined,
    permissions?: IPermissions
): RealtimeAudience | null => {
    if (!tenant) {
        return null;
    }
    return permissions ? { tenant, permissions } : { tenant };
};

/**
 * Internal event envelope. The update is the client wire payload; the audience is
 * server-side only and decides which connected recipients may receive it.
 */
export interface RealtimeEnvelope {
    update: IUpdate & { targetUserId?: string };
    audience: RealtimeAudience | null;
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
    CONNECTION_CLOSED = "CONNECTION_CLOSED",
    CUSTOM_MESSAGE = "CUSTOM_MESSAGE",
}

// WebSocket connection and message queue management
const activeConnections = new Set<string>();
let connectionCount = 0;

// Message queuing for offline clients: a queued frame keeps the audience that
// authorized it, so reconnecting clients are re-checked before delivery.
const messageQueue = new Map<string, QueuedMessage[]>();
const MAX_QUEUE_SIZE = 100;

interface QueuedMessage {
    audience: RealtimeAudience | null;
    frame: WebSocketMessage;
}

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
        /** Authenticated session captured from the server-owned WS connection. */
        sid?: string;
    }) => void
) => {
    appEmitter.on(AppEvents.CUSTOM_MESSAGE, callback);
    return () => appEmitter.off(AppEvents.CUSTOM_MESSAGE, callback);
};

export const onConnectionClosed = (callback: (connectionId: string) => void) => {
    appEmitter.on(AppEvents.CONNECTION_CLOSED, callback);
    return () => appEmitter.off(AppEvents.CONNECTION_CLOSED, callback);
};

export const emitConnectionClosed = (connectionId: string): void => {
    appEmitter.emit(AppEvents.CONNECTION_CLOSED, connectionId);
};

/**
 * Enhanced emit function with error handling and metrics
 */
export const emitUpdate = (payload: IUpdate, audience: RealtimeAudience | null) => {
    try {
        if (!payload.timestamp) {
            payload.timestamp = Date.now();
        }
        appEmitter.emit(AppEvents.DATA_UPDATE, { update: payload, audience } satisfies RealtimeEnvelope);
    } catch (error) {
        console.error("Error emitting update:", error);
        appEmitter.emit("error", error);
    }
};

export const onUpdate = (handler: (envelope: RealtimeEnvelope) => void) => {
    appEmitter.on(AppEvents.DATA_UPDATE, handler);
};

export const onConnectionCount = (handler: (count: number) => void) => {
    appEmitter.on(AppEvents.CONNECTION_COUNT, handler);
};

export const offUpdate = (handler: (envelope: RealtimeEnvelope) => void) => {
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
 * @param frame - Wire frame to queue
 * @param audience - Audience that authorized this frame when it was produced
 */
export const queueMessage = (
    connectionId: string,
    frame: WebSocketMessage,
    audience: RealtimeAudience | null
): void => {
    if (!messageQueue.has(connectionId)) {
        messageQueue.set(connectionId, []);
    }

    const queue = messageQueue.get(connectionId)!;
    queue.push({ audience, frame });

    // Limit queue size to prevent memory issues
    if (queue.length > MAX_QUEUE_SIZE) {
        queue.shift(); // Remove oldest message
    }
};

/**
 * Retrieves and clears all queued messages for a connection
 *
 * @param connectionId - Connection identifier
 * @returns Queued frames paired with the audience that authorized them
 */
export const getQueuedMessages = (connectionId: string): QueuedMessage[] => {
    const messages = messageQueue.get(connectionId) || [];
    messageQueue.delete(connectionId); // Clear queue after retrieval
    return messages;
};

/**
 * Send realtime update immediately
 */
export const sendRealtimeUpdate = (payload: Omit<IUpdate, "timestamp" | "user">) => {
    const { instanceId, tenant, userId } = resolveRealtimeEmitContext(payload);
    try {
        emitUpdate(
            { ...payload, timestamp: Date.now(), instanceId, user: userId },
            buildRealtimeAudience(tenant, payload.permissions)
        );
    } catch (error) {
        console.error("Error sending realtime update:", error);
    }
};

/**
 * Send a minimal removal invalidation (id/type/action only) to the recipients that
 * were authorized by a previous ACL snapshot. No new ACL or record body is sent.
 */
export const sendRealtimeInvalidation = (
    record: string,
    type: POLLINGTYPE,
    action: POLLINGACTIONS,
    audience: RealtimeAudience
): void => {
    const { instanceId, userId } = resolveRealtimeEmitContext({ type, record, action });
    try {
        emitUpdate({ type, record, action, user: userId, timestamp: Date.now(), instanceId }, audience);
    } catch (error) {
        console.error(`Error sending realtime invalidation for ${record}:`, error);
    }
};

/**
 * Send a real-time update to a specific user using the existing event system
 */
export const sendRealtimeUpdateToUser = (userId: string, payload: Omit<IUpdate, "timestamp" | "user">) => {
    const { instanceId, tenant, userId: emitterUserId } = resolveRealtimeEmitContext(payload);
    try {
        // Use the same pattern as sendRealtimeUpdate but with user targeting
        const update: IUpdate = { ...payload, timestamp: Date.now(), instanceId, user: emitterUserId };

        // Add user targeting information to the update
        const targetedUpdate = { ...update, targetUserId: userId };

        // Use the existing emitUpdate system
        emitUpdate(targetedUpdate, buildRealtimeAudience(tenant, payload.permissions));
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
