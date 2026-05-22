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
import type { IUpdate, USER_ONLINE_STATUS } from "@stacks/types";
import { randomUUID } from "crypto";
import type { Context, Hono } from "hono";
import { verify } from "hono/jwt";
import {
    appEmitter,
    getConnectionStats,
    getQueuedMessages,
    offUpdate,
    onUpdate,
    registerConnection,
    unregisterConnection,
} from "../events";
import { getJwtSecret } from "../config/secrets";
import { getAuthToken } from "../middleware/utils";
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
interface WebSocketMessage {
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
    /** Set of message types this connection subscribes to */
    subscriptions: Set<string>;
    /** Connection metadata */
    metadata?: {
        userAgent?: string;
        ip?: string;
        connectedAt: number;
    };
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
        ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
        connectedAt: Date.now(),
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
 * 6. Delivers any queued messages
 *
 * @param connectionId - Unique identifier for the connection
 * @param ws - WebSocket instance
 * @param userId - Optional user ID if authenticated
 * @param metadata - Optional connection metadata
 */
const initializeConnection = async (
    connectionId: string,
    ws: any,
    userId?: string,
    metadata?: any
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
            subscriptions: new Set(["update"]), // Default subscription to updates
            metadata,
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

        // Send connection acknowledgment with current stats
        const stats = getConnectionStats();
        const ackMessage: WebSocketMessage = {
            type: "connection_ack",
            payload: {
                connectionId,
                userId,
                ...stats,
                serverTime: Date.now(),
            },
            timestamp: Date.now(),
        };

        safeSend(ws, JSON.stringify(ackMessage), connectionId);

        // Deliver any queued messages for authenticated users
        if (userId) {
            try {
                const queuedMessages = getQueuedMessages(userId);
                if (queuedMessages.length > 0) {
                    console.log(`Delivering ${queuedMessages.length} queued messages to user ${userId}`);
                    queuedMessages.forEach(message => {
                        safeSend(ws, JSON.stringify(message), connectionId);
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
                    broadcastMessage("user_status_updated", {
                        user: conn.userId,
                        status: "offline",
                        timestamp: Date.now(),
                    });
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
 * Broadcasts a message to all subscribed connections
 *
 * This function:
 * 1. Formats the message with timestamp
 * 2. Iterates through all active connections
 * 3. Filters by subscription type
 * 4. Attempts delivery to each subscribed connection
 * 5. Queues failed messages for authenticated users
 * 6. Logs delivery statistics
 *
 * @param type - Message type identifier
 * @param payload - Message payload data
 * @param subscription - Subscription filter (defaults to 'update')
 * @param excludeConnectionId - Optional connection ID to exclude from broadcast
 */
const broadcastMessage = (
    type: MessageType,
    payload: any,
    subscription: string = "update",
    excludeConnectionId?: string
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

const sendMessageToUser = (
    userId: string,
    type: MessageType,
    payload: any,
    subscription: string = "update"
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

        userConnectionIds.forEach((connectionId) => {
            const conn = connections.get(connectionId);
            if (!conn) {
                console.warn(`Connection ${connectionId} not found for user ${userId}`);
                return;
            }

            // Check subscription
            if (!conn.subscriptions.has(subscription)) {
                return;
            }

            // Attempt delivery
            if (safeSend(conn.ws, messageStr, connectionId)) {
                successCount++;
            } else {
                failureCount++;
            }
        });

        console.log(
            `Message to user ${userId}: ${successCount} delivered, ${failureCount} failed`
        );

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
            const stats = getConnectionStats();
            const statsMessage: WebSocketMessage = {
                type: "stats",
                payload: stats,
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
                connectionId
            ); // Exclude the sender

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
 * Authenticates a WebSocket connection using JWT token
 *
 * This function:
 * 1. Validates JWT_SECRET environment variable
 * 2. Verifies the JWT token signature and expiration
 * 3. Extracts user ID from token payload
 * 4. Validates user exists in database
 * 5. Returns user ID if authentication succeeds
 *
 * @param c - Hono context object
 * @returns User ID if authentication successful, undefined otherwise
 */
const authenticateConnection = async (c: any): Promise<string | undefined> => {
    const token = await getAuthToken(c);
    if (!token) {
        console.log("No authentication token provided for WebSocket connection");
        return undefined;
    }

    try {
        const secret = getJwtSecret();

        // Verify token
        const payload = await verify(token, secret, "HS256");

        // Validate payload structure
        if (!payload || typeof payload !== "object") {
            console.warn("Invalid JWT payload: not an object");
            return undefined;
        }

        if (!payload.uid) {
            console.warn("Invalid JWT payload: missing uid field");
            return undefined;
        }

        // Verify user exists and is active
        const user = await UserEntity.findOne({
            where: {
                id: payload.uid,
            },
        });

        if (!user) {
            console.warn(`Authentication failed: User ${payload.uid} not found`);
            return undefined;
        }

        const userId = user.id.toString();
        console.log(`Successfully authenticated WebSocket connection for user: ${userId}`);
        return userId;
    } catch (error: any) {
        if (error?.name === "TokenExpiredError") {
            console.warn("JWT token expired during WebSocket authentication");
        } else if (error?.name === "JsonWebTokenError") {
            console.warn("Invalid JWT token during WebSocket authentication:", error?.message);
        } else {
            console.error("Unexpected error during WebSocket authentication:", error);
        }
        return undefined;
    }
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
export const registerSocket = (app: Hono) => {
    if (process.env.NODE_ENV === "test") {
        return () => {};
    }
    try {
        const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

        // Initialize heartbeat monitoring
        if (!heartbeatInterval) {
            startHeartbeat();
            console.log("❤️ WebSocket heartbeat monitoring started");
        }

        // Register global update handler for broadcasting system-wide updates
        const globalUpdateHandler = (payload: IUpdate & { targetUserId?: string }) => {
            try {
                if (payload.targetUserId) {
                    // Send to specific user
                    const success = sendMessageToUser(payload.targetUserId, "update", payload);
                    if (success) {
                        console.log(`Real-time update sent to user ${payload.targetUserId}: ${payload.type}/${payload.action}`);
                    } else {
                        console.log(`Failed to send real-time update to user ${payload.targetUserId}: no active connections`);
                    }
                } else {
                    // Broadcast to all users (existing behavior)
                    broadcastMessage("update", payload);
                }
            } catch (error) {
                console.error("Failed to handle global update:", error);
            }
        };
        onUpdate(globalUpdateHandler);

        // Main WebSocket endpoint
        app.get(
            "/ws",
            upgradeWebSocket(async (c: Context) => {
                const connectionId = randomUUID();
                console.log(`New WebSocket connection attempt: ${connectionId}`);

                const userId = await authenticateConnection(c);
                const metadata = getConnectionMetadata(c);

                return {
                    /**
                     * Handles new WebSocket connections
                     */
                    onOpen: (evt: Event, ws: any) => {
                        try {
                            console.log(`WebSocket connection opened: ${connectionId}`);
                            initializeConnection(connectionId, ws, userId, metadata);
                        } catch (error) {
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
                    },

                    /**
                     * Handles incoming WebSocket messages
                     */
                    onMessage: async (evt: MessageEvent, ws: any) => {
                        const conn = connections.get(connectionId);
                        if (!conn) {
                            console.error(`Received message from unregistered connection: ${connectionId}`);
                            return;
                        }

                        conn.lastSeen = Date.now();

                        try {
                            if (typeof evt.data !== "string") {
                                console.warn(`Invalid message type from connection ${connectionId}`);
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
                    onPong: (evt: Event, ws: any) => {
                        const conn = connections.get(connectionId);
                        if (conn) {
                            conn.lastSeen = Date.now();
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

        // WebSocket statistics endpoint
        app.get("/ws/stats", async c => {
            try {
                const stats = getConnectionStats();
                const connectionDetails = Array.from(connections.values()).map(conn => ({
                    id: conn.id,
                    userId: conn.userId,
                    lastSeen: conn.lastSeen,
                    timeSinceLastSeen: Date.now() - conn.lastSeen,
                    subscriptions: Array.from(conn.subscriptions),
                    metadata: conn.metadata,
                }));

                return c.json({
                    success: true,
                    data: {
                        ...stats,
                        connections: connectionDetails,
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
