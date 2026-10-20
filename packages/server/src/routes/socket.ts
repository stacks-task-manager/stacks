// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * WebSocket connection management and real-time communication
 *
 * This module handles WebSocket connections for real-time features including:
 * - User authentication and connection tracking
 * - Heartbeat monitoring and connection health
 * - Message broadcasting and queuing
 * - User status management
 * - Connection statistics and monitoring
 */

import { createNodeWebSocket } from "@hono/node-ws";
import { UserEntity } from "@stacks/db";
import type { USER_ONLINE_STATUS } from "@stacks/types";
import { randomUUID } from "crypto";
import type { Context, Hono, MiddlewareHandler } from "hono";
import {
    appEmitter,
    emitConnectionClosed,
    getQueuedMessages,
    offUpdate,
    onUpdate,
    registerConnection,
    unregisterConnection,
} from "../events";
import type { RealtimeEnvelope } from "../events";
import { isFrameAuthorized } from "../utils/realtimeAudience";
import type { RealtimeAudience, RealtimeRecipient } from "../utils/realtimeAudience";
import { isTrustedOrigin } from "../config/origins";
import { resolveAccountState, resolveAuthenticatedIdentity } from "../middleware/auth";
import { sessionStillValid } from "../services/sessions";
import { getClientIP } from "../utils/clientIp";
import {
    acquireRateLimitLease,
    consumeRateLimit,
    releaseRateLimitLease,
    renewRateLimitLease,
} from "../utils/rateLimit";
import type { AuthIdentity } from "../middleware/auth";
import {
    initializeUserConnection,
    removeUserConnectionStatus,
    updateUserConnectionStatus,
} from "../services/userStatusService";

// WebSocket configuration constants
/** Interval for sending heartbeat pings (30 seconds) */
const HEARTBEAT_INTERVAL = 30000;
/** Timeout for considering a connection dead (5 seconds) */
const HEARTBEAT_TIMEOUT = 5000;
/** Re-check an idle connection's identity at most this often (60 seconds) */
const IDENTITY_REVALIDATION_INTERVAL = 60000;
/** Close code for a connection whose account or token is no longer valid */
const CLOSE_CODE_REVOKED = 1008;
export const MAX_WEBSOCKET_MESSAGE_BYTES = 256 * 1024;

/** Applies the same byte limit used by the handler before ws buffers whole messages. */
export function configureWebSocketPayloadLimit(wss: { options: { maxPayload?: number } }): void {
    wss.options.maxPayload = MAX_WEBSOCKET_MESSAGE_BYTES;
}
const WEBSOCKET_CONNECTION_LEASE_MS = 10 * 60_000;
const MAX_WEBSOCKET_CONNECTIONS_PER_USER = 5;
const MAX_WEBSOCKET_CONNECTIONS_PER_IP = 100;
/** Valid user status values */
const VALID_USER_STATUSES = ["online", "idle", "offline"] as const;
const IS_DEV = process.env.NODE_ENV === "development";

// Type definitions
/** WebSocket message types */
type MessageType =
    | "ping"
    | "pong"
    | "stats"
    | "user_status"
    | "user_status_updated"
    | "connection_ack"
    | "update"
    | "error"
    | "message_ack"
    | "ai_chat_delta"
    | "ai_chat_done"
    | "ai_chat_error";

/** WebSocket message structure */
export interface WebSocketMessage {
    type: MessageType;
    payload?: any;
    timestamp?: number;
    messageId?: string;
    connectionId?: string;
}

/** Connection information for tracking WebSocket connections */
interface ConnectionInfo {
    /** Unique connection identifier */
    id: string;
    /** Associated user ID if authenticated */
    userId?: string;
    /** WebSocket instance */
    ws: any;
    /** Last activity timestamp */
    lastSeen: number;
    /** Token expiry (epoch ms) from the credential that authenticated this connection */
    tokenExpiresAt?: number;
    /** Session row behind that credential; revoking it closes this connection */
    sid?: string;
    /** Last identity revalidation (epoch ms) */
    lastRevalidated?: number;
    /** Delivery identity: tenant/role/admin for the authorized recipient */
    identity?: RealtimeRecipient;
    /** Set of message types this connection subscribes to */
    subscriptions: Set<string>;
    /** Connection metadata */
    metadata?: {
        userAgent?: string;
        ip?: string;
        connectedAt: number;
    };
    rateLimitLeaseIds?: string[];
}

/** Connection statistics */
interface ConnectionStats {
    total: number;
    authenticated: number;
    anonymous: number;
    byUser: Record<string, number>;
}

// Global state management
/** Map of all active WebSocket connections */
const connections = new Map<string, ConnectionInfo>();
/** Map of user IDs to their connection IDs */
const userConnections = new Map<string, Set<string>>();
/** Heartbeat monitoring interval */
let heartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Starts the heartbeat monitoring system
 *
 * This function:
 * 1. Monitors all active connections for activity
 * 2. Removes dead connections that exceed timeout
 * 3. Sends ping messages to maintain connection health
 * 4. Cleans up stale connection data
 */
const startHeartbeat = (): void => {
    if (heartbeatInterval) {
        console.warn("Heartbeat monitoring already started");
        return;
    }

    console.log("❤️ Starting WebSocket heartbeat monitoring");

    heartbeatInterval = setInterval(() => {
        const now = Date.now();
        const deadConnections: string[] = [];

        connections.forEach((conn, id) => {
            const timeSinceLastSeen = now - conn.lastSeen;

            // Remove connections that have been inactive too long
            if (timeSinceLastSeen > HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT) {
                console.log(
                    `Removing dead connection: ${id} ` +
                        `(user: ${conn.userId || "anonymous"}, inactive for ${timeSinceLastSeen}ms)`
                );
                deadConnections.push(id);
                return;
            }

            // Re-check the account behind an idle connection at most once per
            // IDENTITY_REVALIDATION_INTERVAL; a revoked account closes with 1008.
            if (needsIdleRevalidation(conn.lastRevalidated, now)) {
                ensureIdentityStillValid(id).catch(error => {
                    console.error(`Error revalidating idle connection ${id}:`, error);
                });
            }

            // Send ping to connections that haven't been active recently
            if (timeSinceLastSeen > HEARTBEAT_INTERVAL / 2) {
                const pingMessage: WebSocketMessage = {
                    type: "ping",
                    timestamp: now,
                };

                if (!safeSend(conn.ws, JSON.stringify(pingMessage), id)) {
                    console.warn(`Failed to ping connection ${id}, marking for removal`);
                    deadConnections.push(id);
                }
            }
        });

        // Clean up dead connections
        deadConnections.forEach(id => {
            cleanupConnection(id).catch(error => {
                console.error(`Error cleaning up connection ${id}:`, error);
            });
        });

        // Log periodic stats (dev only)
        if (IS_DEV && connections.size > 0) {
            console.log(`💓 Heartbeat check: ${connections.size} active connections`);
        }
    }, HEARTBEAT_INTERVAL);
};

// Helper Functions

/**
 * Safely sends data to a WebSocket connection with error handling
 *
 * @param ws - WebSocket instance
 * @param data - JSON string data to send
 * @param connectionId - Connection identifier for logging
 * @returns true if message was sent successfully, false otherwise
 */
const safeSend = (ws: any, data: string, connectionId: string): boolean => {
    try {
        // Check WebSocket ready state (1 = OPEN)
        if (ws.readyState === 1) {
            ws.send(data);
            return true;
        } else {
            const stateNames = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
            const stateName = stateNames[ws.readyState] || "UNKNOWN";
            console.warn(
                `WebSocket not ready for connection ${connectionId}, ` +
                    `state: ${ws.readyState} (${stateName})`
            );
            return false;
        }
    } catch (error) {
        console.error(`Error sending to connection ${connectionId}:`, error);
        return false;
    }
};

/**
 * Validates and parses WebSocket message data
 *
 * @param data - Raw message data
 * @returns Parsed message object or null if invalid
 */
const parseWebSocketMessage = (data: any): WebSocketMessage | null => {
    try {
        if (typeof data !== "string") {
            return null;
        }

        const parsed = JSON.parse(data);

        if (!parsed || typeof parsed !== "object" || !parsed.type) {
            return null;
        }

        return parsed as WebSocketMessage;
    } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        return null;
    }
};

/**
 * Gets connection metadata from request context
 *
 * @param c - Hono context
 * @returns Connection metadata object
 */
const getConnectionMetadata = (c: Context) => {
    return {
        userAgent: c.req.header("user-agent"),
        ip: getClientIP(c),
        connectedAt: Date.now(),
    };
};

/**
 * Captures the delivery identity used to authorize frames for this connection.
 * Only authenticated rows produce an identity; a missing row fails closed.
 */
const captureRealtimeIdentity = (user: UserEntity | undefined): RealtimeRecipient | undefined => {
    if (!user) {
        return undefined;
    }
    return {
        userId: String(user.id),
        tenant: String(user.get("tenant") ?? ""),
        role: String(user.get("role") ?? ""),
        admin: Boolean(user.get("admin")),
    };
};

/**
 * User-visible statistics for one tenant: counts and details are scoped to the
 * connections whose authenticated identity belongs to that tenant. Server-global
 * queue aggregates stay internal (see events.getConnectionStats) and are never
 * serialized into a client payload.
 */
const tenantConnectionPayload = (tenant: string | undefined) => {
    if (!tenant) {
        return { activeConnections: 0, connections: [] };
    }
    const scoped = Array.from(connections.values()).filter(conn => conn.identity?.tenant === tenant);
    return {
        activeConnections: scoped.length,
        connections: scoped.map(conn => ({
            id: conn.id,
            userId: conn.userId,
            lastSeen: conn.lastSeen,
            timeSinceLastSeen: Date.now() - conn.lastSeen,
            subscriptions: Array.from(conn.subscriptions),
            metadata: conn.metadata,
        })),
    };
};

/**
 * Initializes a new WebSocket connection with proper registration and setup
 *
 * This function:
 * 1. Creates and stores connection information
 * 2. Registers the connection globally
 * 3. Tracks user-specific connections if authenticated
 * 4. Initializes user status tracking
 * 5. Sends connection acknowledgment
 * 6. Delivers any queued messages the recipient is still authorized for
 *
 * @param connectionId - Unique identifier for the connection
 * @param ws - WebSocket instance
 * @param userId - Optional user ID if authenticated
 * @param metadata - Optional connection metadata
 * @param tokenExpiresAt - Token expiry (epoch ms) for the authenticated identity
 * @param identity - Delivery identity captured from the authenticated user row
 * @param sid - Session row behind the credential, revalidated while the socket lives
 */
const initializeConnection = async (
    connectionId: string,
    ws: any,
    userId?: string,
    metadata?: any,
    tokenExpiresAt?: number,
    identity?: RealtimeRecipient,
    sid?: string,
    rateLimitLeaseIds?: string[]
): Promise<void> => {
    try {
        console.log(
            `Initializing WebSocket connection: ${connectionId}` +
                `${userId ? ` for user ${userId}` : " (anonymous)"}`
        );

        // Create connection info with metadata
        const connectionInfo: ConnectionInfo = {
            id: connectionId,
            userId,
            ws,
            lastSeen: Date.now(),
            tokenExpiresAt,
            lastRevalidated: userId ? Date.now() : undefined,
            identity,
            sid,
            subscriptions: new Set(["update"]), // Default subscription to updates
            metadata,
            rateLimitLeaseIds,
        };

        // Store connection and register globally
        connections.set(connectionId, connectionInfo);
        registerConnection(connectionId);

        // Track user-specific connections if authenticated
        if (userId) {
            if (!userConnections.has(userId)) {
                userConnections.set(userId, new Set());
            }
            userConnections.get(userId)!.add(connectionId);

            // Initialize user status tracking
            try {
                await initializeUserConnection(userId, connectionId);
            } catch (error) {
                console.error(`Failed to initialize user connection status for ${userId}:`, error);
            }
        }

        // The client may close while the asynchronous user-status write is in flight.
        if (!connections.has(connectionId) || ws.readyState !== 1) {
            if (connections.has(connectionId)) await cleanupConnection(connectionId);
            return;
        }

        // Send connection acknowledgment with this tenant's counts only
        const ackMessage: WebSocketMessage = {
            type: "connection_ack",
            payload: {
                connectionId,
                userId,
                tenant: identity?.tenant,
                activeConnections: tenantConnectionPayload(identity?.tenant).activeConnections,
                serverTime: Date.now(),
            },
            timestamp: Date.now(),
        };

        safeSend(ws, JSON.stringify(ackMessage), connectionId);

        // Deliver any queued messages for authenticated users
        if (userId) {
            try {
                const queuedMessages = getQueuedMessages(userId);
                const deliverable = queuedMessages.filter(entry =>
                    isFrameAuthorized(entry.audience, connectionInfo.identity)
                );
                if (deliverable.length > 0) {
                    console.log(
                        `Delivering ${deliverable.length} of ${queuedMessages.length} queued messages to user ${userId}`
                    );
                    deliverable.forEach(entry => {
                        safeSend(ws, JSON.stringify(entry.frame), connectionId);
                    });
                }
            } catch (error) {
                console.error(`Failed to deliver queued messages to user ${userId}:`, error);
            }
        }

        console.log(`WebSocket connection ${connectionId} initialized successfully`);
    } catch (error) {
        console.error(`Failed to initialize connection ${connectionId}:`, error);
        // Clean up on initialization failure
        connections.delete(connectionId);
        unregisterConnection(connectionId);
        emitConnectionClosed(connectionId);
        throw error;
    }
};

/**
 * Cleans up a WebSocket connection and removes all associated data
 *
 * This function:
 * 1. Removes connection from global tracking
 * 2. Updates user connection tracking
 * 3. Updates user status if authenticated
 * 4. Broadcasts status changes to other connections
 *
 * @param connectionId - Connection identifier to clean up
 */
const cleanupConnection = async (connectionId: string): Promise<void> => {
    const conn = connections.get(connectionId);
    if (!conn) {
        console.warn(`Attempted to cleanup non-existent connection: ${connectionId}`);
        return;
    }

    try {
        console.log(
            `Cleaning up connection: ${connectionId}` +
                `${conn.userId ? ` for user ${conn.userId}` : " (anonymous)"}`
        );

        // Remove from global connections
        connections.delete(connectionId);
        unregisterConnection(connectionId);
        emitConnectionClosed(connectionId);
        await Promise.all(
            (conn.rateLimitLeaseIds ?? []).map(id =>
                releaseRateLimitLease(id).catch(() => {
                    console.error("WebSocket connection lease release failed");
                })
            )
        );

        // Handle user-specific cleanup
        if (conn.userId) {
            const userConns = userConnections.get(conn.userId);
            if (userConns) {
                userConns.delete(connectionId);

                // Remove user entry if no more connections
                if (userConns.size === 0) {
                    userConnections.delete(conn.userId);
                    console.log(`User ${conn.userId} has no more active connections`);
                }
            }

            // Update user status and broadcast changes
            try {
                await removeUserConnectionStatus(conn.userId, connectionId);

                // Broadcast user status change if they went offline
                if (!isUserOnline(conn.userId)) {
                    broadcastMessage(
                        "user_status_updated",
                        {
                            user: conn.userId,
                            status: "offline",
                            timestamp: Date.now(),
                        },
                        "update",
                        undefined,
                        { tenant: conn.identity?.tenant ?? "" }
                    );
                }
            } catch (error) {
                console.error(`Failed to update user status during cleanup for ${conn.userId}:`, error);
            }
        }

        console.log(`Connection ${connectionId} cleaned up successfully`);
    } catch (error) {
        console.error(`Error during connection cleanup for ${connectionId}:`, error);
    }
};

/**
 * Pure predicate: should an idle connection re-check its identity now?
 *
 * @param lastRevalidated - epoch ms of the previous check (undefined = never)
 * @param now - epoch ms to compare against
 */
export const needsIdleRevalidation = (lastRevalidated?: number, now?: number): boolean => {
    if (lastRevalidated === undefined) {
        return true;
    }
    return (now ?? Date.now()) - lastRevalidated >= IDENTITY_REVALIDATION_INTERVAL;
};

/**
 * Re-checks the account and token behind a live connection.
 *
 * @returns false when the connection was closed (code 1008) and its presence,
 * queue, and subscription state were removed by the close event.
 */
const ensureIdentityStillValid = async (connectionId: string): Promise<boolean> => {
    const conn = connections.get(connectionId);
    if (!conn || !conn.userId) {
        return true;
    }

    const now = Date.now();
    conn.lastRevalidated = now;

    let reason: string | null = null;
    if (conn.tokenExpiresAt !== undefined && conn.tokenExpiresAt <= now) {
        reason = "Token expired";
    } else if (conn.sid && !(await sessionStillValid(conn.sid, conn.userId))) {
        reason = "Session was revoked";
    } else {
        const account = await resolveAccountState(conn.userId);
        if (account.ok) {
            conn.identity = captureRealtimeIdentity(account.user);
            return true;
        }
        reason = account.failure === "unknown-user" ? "Account not found" : "Account is no longer active";
    }

    console.warn(`Identity no longer valid for connection ${connectionId}: ${reason}`);

    const errorMessage: WebSocketMessage = {
        type: "error",
        payload: {
            message: "Session is no longer valid",
            code: "IDENTITY_REVOKED",
        },
        timestamp: now,
    };
    safeSend(conn.ws, JSON.stringify(errorMessage), connectionId);

    try {
        conn.ws.close(CLOSE_CODE_REVOKED, reason);
    } catch (error) {
        console.error(`Failed to close revoked connection ${connectionId}:`, error);
    }

    return false;
};

/**
 * Broadcasts a message to all subscribed connections
 *
 * This function:
 * 1. Formats the message with timestamp
 * 2. Iterates through all active connections
 * 3. Filters by subscription type
 * 4. Authorizes each recipient against the event audience
 * 5. Serializes and attempts delivery only for authorized recipients
 * 6. Logs delivery statistics
 *
 * @param type - Message type identifier
 * @param payload - Message payload data
 * @param subscription - Subscription filter (defaults to 'update')
 * @param excludeConnectionId - Optional connection ID to exclude from broadcast
 * @param audience - Trusted audience for this event; a missing audience delivers nothing
 */
const broadcastMessage = (
    type: MessageType,
    payload: any,
    subscription: string = "update",
    excludeConnectionId?: string,
    audience: RealtimeAudience | null = null
): void => {
    try {
        const message: WebSocketMessage = {
            type,
            payload,
            timestamp: Date.now(),
        };

        const messageStr = JSON.stringify(message);
        let successCount = 0;
        let failureCount = 0;
        let excludedCount = 0;

        connections.forEach((conn, connectionId) => {
            // Skip excluded connection
            if (excludeConnectionId && connectionId === excludeConnectionId) {
                excludedCount++;
                return;
            }

            // Check subscription
            if (!conn.subscriptions.has(subscription)) {
                return;
            }

            // Authorize before serialization: an unauthorized recipient never sees the frame
            if (!isFrameAuthorized(audience, conn.identity)) {
                return;
            }

            // Attempt delivery
            if (safeSend(conn.ws, messageStr, connectionId)) {
                successCount++;
            } else {
                failureCount++;

                // Log failed delivery for authenticated users
                if (conn.userId) {
                    console.log(`Failed to deliver message to user ${conn.userId}`);
                }
            }
        });

        console.log(
            `Broadcast '${type}': ${successCount} delivered, ${failureCount} failed` +
                `${excludedCount > 0 ? `, ${excludedCount} excluded` : ""}`
        );
    } catch (error) {
        console.error(`Failed to broadcast message '${type}':`, error);
    }
};

/**
 * Targeted delivery: the server already decided this recipient, so the registry
 * key is the addressing basis. An audience that carries a resource ACL is still
 * checked against it; frames without an ACL (AI deltas, notifications) keep the
 * existing targeted behaviour.
 */
const sendMessageToUser = (
    userId: string,
    type: MessageType,
    payload: any,
    subscription: string = "update",
    audience: RealtimeAudience | null = null
): boolean => {
    try {
        const userConnectionIds = userConnections.get(userId);
        if (!userConnectionIds || userConnectionIds.size === 0) {
            console.log(`No active connections found for user ${userId}`);
            return false;
        }

        const message: WebSocketMessage = {
            type,
            payload,
            timestamp: Date.now(),
        };

        const messageStr = JSON.stringify(message);
        let successCount = 0;
        let failureCount = 0;

        userConnectionIds.forEach(connectionId => {
            const conn = connections.get(connectionId);
            if (!conn) {
                console.warn(`Connection ${connectionId} not found for user ${userId}`);
                return;
            }

            // Check subscription
            if (!conn.subscriptions.has(subscription)) {
                return;
            }

            // Check the resource ACL when the event carries one
            if (audience?.permissions && !isFrameAuthorized(audience, conn.identity)) {
                return;
            }

            // Attempt delivery
            if (safeSend(conn.ws, messageStr, connectionId)) {
                successCount++;
            } else {
                failureCount++;
            }
        });

        console.log(`Message to user ${userId}: ${successCount} delivered, ${failureCount} failed`);

        return successCount > 0;
    } catch (error) {
        console.error(`Failed to send message to user ${userId}:`, error);
        return false;
    }
};

/**
 * Message handlers for different WebSocket message types
 * Each handler receives the WebSocket instance, connection ID, and optional data
 */
const messageHandlers = {
    /**
     * Handles ping messages by responding with pong
     */
    ping: (ws: any, connectionId: string): void => {
        const pongMessage: WebSocketMessage = {
            type: "pong",
            payload: { serverTime: Date.now() },
            timestamp: Date.now(),
        };
        safeSend(ws, JSON.stringify(pongMessage), connectionId);
    },

    /**
     * Handles pong messages by updating connection's last seen timestamp
     */
    pong: (ws: any, connectionId: string): void => {
        const conn = connections.get(connectionId);
        if (conn) {
            conn.lastSeen = Date.now();
            if (IS_DEV) {
                console.log(`Received pong from connection ${connectionId}`);
            }
        }
    },

    /**
     * Handles stats requests by sending current connection statistics
     */
    stats: (ws: any, connectionId: string): void => {
        try {
            const conn = connections.get(connectionId);
            const statsMessage: WebSocketMessage = {
                type: "stats",
                payload: {
                    activeConnections: tenantConnectionPayload(conn?.identity?.tenant).activeConnections,
                },
                timestamp: Date.now(),
            };
            safeSend(ws, JSON.stringify(statsMessage), connectionId);
        } catch (error) {
            console.error(`Failed to send stats to connection ${connectionId}:`, error);
        }
    },

    /**
     * Handles user status updates and broadcasts changes to other connections
     */
    user_status: async (ws: any, connectionId: string, data: any): Promise<void> => {
        const conn = connections.get(connectionId);
        if (!conn?.userId) {
            console.warn(`User status update attempted for unauthenticated connection ${connectionId}`);
            return;
        }

        if (!data?.status) {
            console.warn(`Invalid status data received from connection ${connectionId}`);
            return;
        }

        const status = data.status as USER_ONLINE_STATUS;
        if (!VALID_USER_STATUSES.includes(status)) {
            console.warn(`Invalid user status '${status}' from connection ${connectionId}`);
            return;
        }

        try {
            await updateUserConnectionStatus(conn.userId, connectionId, status);

            // Broadcast status change to other connections
            broadcastMessage(
                "user_status_updated",
                {
                    user: conn.userId,
                    status,
                    timestamp: Date.now(),
                },
                "update",
                connectionId, // Exclude the sender
                { tenant: conn.identity?.tenant ?? "" }
            );

            console.log(`Updated status for user ${conn.userId} to '${status}'`);
        } catch (error) {
            console.error(`Failed to update user status for ${conn.userId}:`, error);

            // Send error response to client
            const errorMessage: WebSocketMessage = {
                type: "error",
                payload: {
                    message: "Failed to update user status",
                    code: "STATUS_UPDATE_FAILED",
                },
                timestamp: Date.now(),
            };
            safeSend(ws, JSON.stringify(errorMessage), connectionId);
        }
    },

    /**
     * Handles subscription management
     */
    subscribe: (ws: any, connectionId: string, data: any): void => {
        const conn = connections.get(connectionId);
        if (!conn) return;

        if (data?.channels && Array.isArray(data.channels)) {
            data.channels.forEach((channel: string) => {
                conn.subscriptions.add(channel);
            });
            console.log(`Connection ${connectionId} subscribed to channels:`, data.channels);
        }
    },

    /**
     * Handles unsubscription requests
     */
    unsubscribe: (ws: any, connectionId: string, data: any): void => {
        const conn = connections.get(connectionId);
        if (!conn) return;

        if (data?.channels && Array.isArray(data.channels)) {
            data.channels.forEach((channel: string) => {
                conn.subscriptions.delete(channel);
            });
            console.log(`Connection ${connectionId} unsubscribed from channels:`, data.channels);
        }
    },
};

/**
 * Generic message handler that routes messages to appropriate handlers
 *
 * @param ws - WebSocket instance
 * @param connectionId - Connection identifier
 * @param message - Parsed message object
 */
const handleMessage = async (ws: any, connectionId: string, message: any): Promise<void> => {
    try {
        const { type, payload } = message;

        if (!type) {
            console.warn(`Message without type received from connection ${connectionId}`);
            return;
        }

        // Update connection activity
        const conn = connections.get(connectionId);
        if (conn) {
            conn.lastSeen = Date.now();
        }

        // Route to specific handler
        const handler = messageHandlers[type as keyof typeof messageHandlers];
        if (handler) {
            await handler(ws, connectionId, payload);
        } else {
            // Emit as custom message for application-specific handlers
            appEmitter.emit("CUSTOM_MESSAGE", {
                connectionId,
                messageType: type,
                messageData: message,
                timestamp: message.timestamp || Date.now(),
                userId: conn?.userId,
                sid: conn?.sid,
            });

            // Send acknowledgment
            const ackMessage: WebSocketMessage = {
                type: "message_ack",
                payload: {
                    originalType: type,
                    messageId: message.messageId || Date.now(),
                    status: "received",
                },
                timestamp: Date.now(),
            };
            safeSend(ws, JSON.stringify(ackMessage), connectionId);

            console.log(`Custom message '${type}' processed for connection ${connectionId}`);
        }
    } catch (error) {
        console.error(`Error handling message from connection ${connectionId}:`, error);

        // Send error response to client
        const errorMessage: WebSocketMessage = {
            type: "error",
            payload: {
                message: "Message processing failed",
                code: "MESSAGE_HANDLER_ERROR",
            },
            timestamp: Date.now(),
        };
        safeSend(ws, JSON.stringify(errorMessage), connectionId);
    }
};

/**
 * Authorizes the WebSocket upgrade before the handshake happens
 *
 * This middleware:
 * 1. Runs only for upgrade requests (plain GET /ws passes through untouched)
 * 2. Applies the shared auth policy (resolveAuthenticatedIdentity) so a rejected
 *    client never enters the connection registries
 * 3. Requires a trusted Origin for browser/cookie clients; an absent Origin is
 *    only accepted with a bearer credential (native clients)
 * 4. Attaches the verified identity for the upgrade handler
 *
 * @param c - Hono context object
 * @param next - Next middleware function
 */
const authorizeUpgrade: MiddlewareHandler = async (c, next) => {
    const isUpgrade = c.req.header("upgrade")?.toLowerCase() === "websocket";
    if (!isUpgrade) {
        await next();
        return;
    }

    const identity = await resolveAuthenticatedIdentity(c);
    if (!identity.ok) {
        const inactive =
            identity.failure === "disabled" ||
            identity.failure === "deleted" ||
            identity.failure === "tenant-disabled";
        return inactive ? c.text("Account is not active", 403) : c.text("Not authorized", 401);
    }

    const origin = c.req.header("origin");
    if (origin) {
        if (!isTrustedOrigin(origin)) {
            return c.text("Origin not allowed", 403);
        }
    } else if (identity.source !== "header") {
        return c.text("Origin required", 403);
    }

    c.set("wsIdentity", identity);
    await next();
};

/**
 * Registers WebSocket endpoint and handlers with the Hono application
 *
 * This function:
 * 1. Initializes heartbeat monitoring for connection health
 * 2. Sets up global event listeners for broadcasting updates
 * 3. Configures the main WebSocket endpoint with authentication
 * 4. Handles connection lifecycle events (open, message, close, error, pong)
 * 5. Provides a stats endpoint for monitoring connection metrics
 *
 * @param app - Hono application instance
 * @returns injectWebSocket function for middleware injection
 */
export const registerSocketHandlers = (app: Hono) => {
    try {
        const { injectWebSocket, upgradeWebSocket, wss } = createNodeWebSocket({ app });
        // `ws` defaults to 100 MiB. Set the transport limit so fragmented and
        // binary frames are rejected before they are fully buffered in memory.
        configureWebSocketPayloadLimit(wss);

        // Initialize heartbeat monitoring
        if (!heartbeatInterval) {
            startHeartbeat();
            console.log("❤️ WebSocket heartbeat monitoring started");
        }

        // Register global update handler for broadcasting system-wide updates
        const globalUpdateHandler = (envelope: RealtimeEnvelope) => {
            const { update: payload, audience } = envelope;
            try {
                if (payload.targetUserId) {
                    // Send to specific user
                    const success = sendMessageToUser(
                        payload.targetUserId,
                        "update",
                        payload,
                        "update",
                        audience
                    );
                    if (success) {
                        console.log(
                            `Real-time update sent to user ${payload.targetUserId}: ${payload.type}/${payload.action}`
                        );
                    } else {
                        console.log(
                            `Failed to send real-time update to user ${payload.targetUserId}: no active connections`
                        );
                    }
                } else {
                    // Broadcast to the recipients this audience authorizes
                    broadcastMessage("update", payload, "update", undefined, audience);
                }
            } catch (error) {
                console.error("Failed to handle global update:", error);
            }
        };
        onUpdate(globalUpdateHandler);

        // Authorize the upgrade first so a rejected client never registers.
        app.get("/ws", authorizeUpgrade);

        // Main WebSocket endpoint
        app.get(
            "/ws",
            upgradeWebSocket(async (c: Context) => {
                const connectionId = randomUUID();
                console.log(`New WebSocket connection attempt: ${connectionId}`);

                const identity = c.get("wsIdentity") as AuthIdentity | undefined;
                const userId = identity?.ok ? identity.userId : undefined;
                const tokenExpiresAt = identity?.payload.exp ? identity.payload.exp * 1000 : undefined;
                const sid = identity?.payload.sid;
                const metadata = getConnectionMetadata(c);
                const recipient = identity?.ok ? captureRealtimeIdentity(identity.user) : undefined;
                let initialization: Promise<void> = Promise.resolve();

                return {
                    /**
                     * Handles new WebSocket connections
                     */
                    onOpen: (evt: Event, ws: any) => {
                        const leases: string[] = [];
                        initialization = (async () => {
                            try {
                                console.log(`WebSocket connection opened: ${connectionId}`);
                                const ip = metadata?.ip ?? "unknown";
                                if (userId) {
                                    const userLease = await acquireRateLimitLease(
                                        "websocket-connection-user",
                                        userId,
                                        MAX_WEBSOCKET_CONNECTIONS_PER_USER,
                                        WEBSOCKET_CONNECTION_LEASE_MS
                                    );
                                    if (!userLease) {
                                        ws.close(1013, "Connection limit reached");
                                        return;
                                    }
                                    leases.push(userLease.id);
                                }
                                const ipLease = await acquireRateLimitLease(
                                    "websocket-connection-ip",
                                    ip,
                                    MAX_WEBSOCKET_CONNECTIONS_PER_IP,
                                    WEBSOCKET_CONNECTION_LEASE_MS
                                );
                                if (!ipLease) {
                                    await Promise.all(leases.map(releaseRateLimitLease));
                                    ws.close(1013, "Connection limit reached");
                                    return;
                                }
                                leases.push(ipLease.id);
                                await initializeConnection(
                                    connectionId,
                                    ws,
                                    userId,
                                    metadata,
                                    tokenExpiresAt,
                                    recipient,
                                    sid,
                                    leases
                                );
                            } catch (error) {
                                const conn = connections.get(connectionId);
                                await Promise.all(
                                    (conn?.rateLimitLeaseIds ?? leases).map(id =>
                                        releaseRateLimitLease(id).catch(() => undefined)
                                    )
                                );
                                console.error(
                                    `Failed to initialize WebSocket connection ${connectionId}:`,
                                    error
                                );

                                // Send error and close connection
                                try {
                                    const errorMessage: WebSocketMessage = {
                                        type: "error",
                                        payload: {
                                            message: "Connection initialization failed",
                                            code: "INIT_FAILED",
                                        },
                                        timestamp: Date.now(),
                                    };
                                    ws.send(JSON.stringify(errorMessage));
                                    ws.close(1011, "Initialization failed");
                                } catch (sendError) {
                                    console.error("Failed to send error message:", sendError);
                                }
                            }
                        })();
                        void initialization;
                    },

                    /**
                     * Handles incoming WebSocket messages
                     */
                    onMessage: async (evt: MessageEvent, ws: any) => {
                        await initialization;
                        const conn = connections.get(connectionId);
                        if (!conn) {
                            console.error(`Received message from unregistered connection: ${connectionId}`);
                            return;
                        }

                        conn.lastSeen = Date.now();

                        if (!(await ensureIdentityStillValid(connectionId))) {
                            return;
                        }

                        try {
                            if (typeof evt.data !== "string") {
                                console.warn(`Invalid message type from connection ${connectionId}`);
                                return;
                            }

                            if (Buffer.byteLength(evt.data, "utf8") > MAX_WEBSOCKET_MESSAGE_BYTES) {
                                ws.close(1009, "Message too large");
                                return;
                            }
                            const now = Date.now();
                            let ipDecision;
                            let userDecision;
                            try {
                                ipDecision = await consumeRateLimit(
                                    "websocket-message-ip",
                                    conn.metadata?.ip ?? "unknown",
                                    600,
                                    60_000,
                                    now
                                );
                                userDecision = conn.userId
                                    ? await consumeRateLimit(
                                          "websocket-message-user",
                                          conn.userId,
                                          60,
                                          60_000,
                                          now
                                      )
                                    : { allowed: true };
                            } catch {
                                ws.close(1013, "Message rate limit unavailable");
                                void cleanupConnection(connectionId);
                                return;
                            }
                            if (!ipDecision.allowed || !userDecision.allowed) {
                                ws.close(1013, "Message rate limit exceeded");
                                return;
                            }
                            const leaseIds = conn.rateLimitLeaseIds ?? [];
                            const renewals = await Promise.all(
                                leaseIds.map(id => renewRateLimitLease(id, WEBSOCKET_CONNECTION_LEASE_MS))
                            );
                            if (renewals.some(renewed => !renewed)) {
                                ws.close(1013, "Connection lease expired");
                                void cleanupConnection(connectionId);
                                return;
                            }

                            const data = parseWebSocketMessage(evt.data);
                            if (!data) {
                                console.warn(`Invalid message format from connection ${connectionId}`);

                                // Send format error response
                                const errorMessage: WebSocketMessage = {
                                    type: "error",
                                    payload: {
                                        message: "Invalid message format",
                                        code: "INVALID_FORMAT",
                                    },
                                    timestamp: Date.now(),
                                };
                                safeSend(ws, JSON.stringify(errorMessage), connectionId);
                                return;
                            }

                            await handleMessage(ws, connectionId, data);
                        } catch (error) {
                            console.error(`Error processing message from ${connectionId}:`, error);

                            const errorMessage: WebSocketMessage = {
                                type: "error",
                                payload: {
                                    message: "Message processing failed",
                                    code: "PROCESSING_ERROR",
                                },
                                timestamp: Date.now(),
                            };
                            safeSend(ws, JSON.stringify(errorMessage), connectionId);
                        }
                    },

                    /**
                     * Handles WebSocket connection closures
                     */
                    onClose: (evt: CloseEvent, ws: any) => {
                        console.log(
                            `WebSocket connection closed: ${connectionId} (code: ${evt.code}, reason: ${evt.reason})`
                        );

                        cleanupConnection(connectionId).catch(error => {
                            console.error(`Error during connection cleanup for ${connectionId}:`, error);
                        });
                    },

                    /**
                     * Handles WebSocket errors
                     */
                    onError: (evt: Event, ws: any) => {
                        console.error(`WebSocket error for connection ${connectionId}:`, {
                            error: evt,
                            timestamp: Date.now(),
                        });

                        cleanupConnection(connectionId).catch(error => {
                            console.error(`Failed to cleanup errored connection ${connectionId}:`, error);
                        });
                    },

                    /**
                     * Handles pong responses to ping messages
                     */
                    onPong: async (evt: Event, ws: any) => {
                        const conn = connections.get(connectionId);
                        if (conn) {
                            conn.lastSeen = Date.now();
                            try {
                                const renewals = await Promise.all(
                                    (conn.rateLimitLeaseIds ?? []).map(id =>
                                        renewRateLimitLease(id, WEBSOCKET_CONNECTION_LEASE_MS)
                                    )
                                );
                                if (renewals.some(renewed => !renewed)) {
                                    ws.close(1013, "Connection lease expired");
                                    void cleanupConnection(connectionId);
                                }
                            } catch {
                                ws.close(1013, "Connection lease unavailable");
                                void cleanupConnection(connectionId);
                            }
                            if (IS_DEV) {
                                console.log(`Received pong from connection ${connectionId}`);
                            }
                        } else {
                            console.warn(`Received pong from unregistered connection: ${connectionId}`);
                        }
                    },
                };
            })
        );

        // Tenant-scoped statistics endpoint: an unauthenticated caller has no
        // tenant to scope to, so it gets no counts at all.
        app.get("/ws/stats", async c => {
            const identity = await resolveAuthenticatedIdentity(c);
            if (!identity.ok) {
                return c.text("Not authorized", 401);
            }

            try {
                const scoped = tenantConnectionPayload(identity.user.get("tenant"));

                return c.json({
                    success: true,
                    data: {
                        ...scoped,
                        heartbeatInterval: HEARTBEAT_INTERVAL,
                        heartbeatTimeout: HEARTBEAT_TIMEOUT,
                    },
                    timestamp: Date.now(),
                });
            } catch (error) {
                console.error("Failed to retrieve WebSocket stats:", error);
                return c.json(
                    {
                        success: false,
                        error: "Failed to retrieve statistics",
                        timestamp: Date.now(),
                    },
                    500
                );
            }
        });

        // Cleanup function for graceful shutdown
        const cleanup = () => {
            console.log("Cleaning up WebSocket resources...");

            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }

            offUpdate(globalUpdateHandler);

            // Close all active connections
            connections.forEach((conn, id) => {
                try {
                    if (conn.ws.readyState === 1) {
                        conn.ws.close(1001, "Server shutdown");
                    }
                } catch (error) {
                    console.error(`Error closing connection ${id}:`, error);
                }
            });

            connections.clear();
            userConnections.clear();

            console.log("WebSocket cleanup completed");
        };

        // Store cleanup function for potential use
        (app as any).cleanupWebSocket = cleanup;

        console.log("🔌 WebSocket routes successfully registered");
        return injectWebSocket;
    } catch (error) {
        console.error("Failed to register WebSocket routes:", error);
        throw error;
    }
};

/**
 * Production entry point: skips WS registration during the default test run,
 * but the extracted seam above stays available for the real socket harness.
 */
export const registerSocket = (app: Hono) => {
    if (process.env.NODE_ENV === "test") {
        return () => {};
    }
    return registerSocketHandlers(app);
};

// Utility functions for user connection tracking
export const getUserConnectionCount = (userId: string): number => {
    const userConns = userConnections.get(userId);
    return userConns ? userConns.size : 0;
};

export const isUserOnline = (userId: string): boolean => {
    return getUserConnectionCount(userId) > 0;
};

export const getAllUserConnections = (): Map<string, Set<string>> => {
    return new Map(userConnections);
};

export const getUserStatus = (userId: string): "online" | "offline" => {
    return isUserOnline(userId) ? "online" : "offline";
};

export { sendMessageToUser };
