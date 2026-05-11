// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * User Status Service
 *
 * This service manages user online/offline/idle status across multiple WebSocket connections.
 * It provides functionality to:
 * - Track user status per connection
 * - Determine overall user status based on all active connections
 * - Update user status in the database
 * - Emit status change events for real-time updates
 *
 * Status Priority: online > idle > offline
 * A user is considered:
 * - Online: if at least one connection is online
 * - Idle: if no connections are online but at least one is idle
 * - Offline: if no active connections exist
 */

import { UserEntity } from "@stacks/db";
import { translate } from "@stacks/translations";
import { Errors } from "../errors";
import { IPerson, USER_ONLINE_STATUS } from "@stacks/types";
import { appEmitter, AppEvents } from "../events";
import { getUserConnectionCount } from "../routes/socket";

/** Interface for connection status tracking */
interface ConnectionStatusInfo {
    status: USER_ONLINE_STATUS;
    lastUpdated: number;
    connectionId: string;
}

/**
 * Map tracking user status states per connection
 * Structure: userId -> Map<connectionId, ConnectionStatusInfo>
 */
const userStatusStates = new Map<string, Map<string, ConnectionStatusInfo>>();

/** Cache for user status to avoid unnecessary database updates */
const userStatusCache = new Map<string, USER_ONLINE_STATUS>();

/**
 * Updates user status for a specific connection and recalculates overall status
 *
 * This function:
 * 1. Tracks the status for the specific connection
 * 2. Determines the overall user status across all connections
 * 3. Updates the database if the overall status changed
 * 4. Emits a status change event for real-time updates
 *
 * @param userId - The user ID
 * @param connectionId - The connection ID
 * @param status - The new status for this connection
 * @throws Error if userId or connectionId is invalid
 */
export const updateUserConnectionStatus = async (
    userId: string,
    connectionId: string,
    status: USER_ONLINE_STATUS
): Promise<void> => {
    try {
        // Validate input parameters
        if (!userId || !connectionId) {
            throw Errors.badRequest(translate("User ID and connection ID required"));
        }

        if (!["online", "idle", "offline"].includes(status)) {
            throw Errors.badRequest(translate("Invalid connection status"));
        }

        console.log(`Updating user ${userId} connection ${connectionId} status to: ${status}`);

        // Initialize user status tracking if not exists
        if (!userStatusStates.has(userId)) {
            userStatusStates.set(userId, new Map());
        }

        const userConnections = userStatusStates.get(userId)!;
        const connectionInfo: ConnectionStatusInfo = {
            status,
            lastUpdated: Date.now(),
            connectionId,
        };

        userConnections.set(connectionId, connectionInfo);

        // Determine the overall user status
        const overallStatus = determineOverallUserStatus(userId);
        const previousStatus = userStatusCache.get(userId);

        // Only update database and emit event if status actually changed
        if (previousStatus !== overallStatus) {
            await updateUserStatusInDB(userId, overallStatus);
            userStatusCache.set(userId, overallStatus);

            // Emit status change event
            try {
                appEmitter.emit(AppEvents.CUSTOM_MESSAGE, {
                    type: "user_status_changed",
                    userId,
                    status: overallStatus,
                    previousStatus,
                    connectionCount: getUserConnectionCount(userId),
                    timestamp: new Date().toISOString(),
                    connectionId,
                });

                console.log(
                    `User ${userId} status changed from ${previousStatus || "unknown"} to ${overallStatus}`
                );
            } catch (emitError) {
                console.error(`Failed to emit status change event for user ${userId}:`, emitError);
            }
        }
    } catch (error) {
        console.error(`Failed to update user connection status for ${userId}:`, error);
        throw error;
    }
};

/**
 * Removes connection status tracking when a connection closes
 *
 * This function:
 * 1. Removes the specific connection from tracking
 * 2. Recalculates overall user status
 * 3. Sets user as offline if no connections remain
 * 4. Updates database and emits events as needed
 *
 * @param userId - The user ID
 * @param connectionId - The connection ID to remove
 * @throws Error if userId or connectionId is invalid
 */
export const removeUserConnectionStatus = async (userId: string, connectionId: string): Promise<void> => {
    try {
        // Validate input parameters
        if (!userId || !connectionId) {
            throw Errors.badRequest(translate("User ID and connection ID required"));
        }

        console.log(`Removing connection ${connectionId} for user ${userId}`);

        const userConnections = userStatusStates.get(userId);
        if (!userConnections) {
            console.warn(`No connection tracking found for user ${userId}`);
            return;
        }

        // Check if connection exists before removal
        if (!userConnections.has(connectionId)) {
            console.warn(`Connection ${connectionId} not found for user ${userId}`);
            return;
        }

        userConnections.delete(connectionId);
        const previousStatus = userStatusCache.get(userId);

        // If no more connections, remove user from tracking and set offline
        if (userConnections.size === 0) {
            userStatusStates.delete(userId);
            userStatusCache.delete(userId);

            console.log(`User ${userId} has no more connections, setting offline`);

            // Set user as offline
            await updateUserStatusInDB(userId, USER_ONLINE_STATUS.OFFLINE);

            // Emit offline event
            try {
                appEmitter.emit(AppEvents.CUSTOM_MESSAGE, {
                    type: "user_status_changed",
                    userId,
                    status: USER_ONLINE_STATUS.OFFLINE,
                    previousStatus,
                    connectionCount: 0,
                    timestamp: new Date().toISOString(),
                    connectionId,
                });
            } catch (emitError) {
                console.error(`Failed to emit offline event for user ${userId}:`, emitError);
            }
        } else {
            // Recalculate overall status with remaining connections
            const overallStatus = determineOverallUserStatus(userId);

            // Only update if status changed
            if (previousStatus !== overallStatus) {
                await updateUserStatusInDB(userId, overallStatus);
                userStatusCache.set(userId, overallStatus);

                try {
                    appEmitter.emit(AppEvents.CUSTOM_MESSAGE, {
                        type: "user_status_changed",
                        userId,
                        status: overallStatus,
                        previousStatus,
                        connectionCount: getUserConnectionCount(userId),
                        timestamp: new Date().toISOString(),
                        connectionId,
                    });

                    console.log(`User ${userId} status updated to ${overallStatus} after connection removal`);
                } catch (emitError) {
                    console.error(`Failed to emit status change event for user ${userId}:`, emitError);
                }
            }
        }
    } catch (error) {
        console.error(`Failed to remove user connection status for ${userId}:`, error);
        throw error;
    }
};

/**
 * Determines overall user status based on all active connections
 *
 * Status Priority: online > idle > offline
 * - If any connection is online, user is online
 * - If no connections are online but at least one is idle, user is idle
 * - If no connections exist or all are offline, user is offline
 *
 * @param userId - The user ID
 * @returns The overall user status
 */
const determineOverallUserStatus = (userId: string): USER_ONLINE_STATUS => {
    const userConnections = userStatusStates.get(userId);

    // No connections means offline
    if (!userConnections || userConnections.size === 0) {
        return USER_ONLINE_STATUS.OFFLINE;
    }

    const connectionInfos = Array.from(userConnections.values());
    const statuses = connectionInfos.map(info => info.status);

    // Priority-based status determination
    if (statuses.includes(USER_ONLINE_STATUS.ONLINE)) {
        return USER_ONLINE_STATUS.ONLINE;
    }

    if (statuses.includes(USER_ONLINE_STATUS.IDLE)) {
        return USER_ONLINE_STATUS.IDLE;
    }

    // All connections are offline or no valid statuses
    return USER_ONLINE_STATUS.OFFLINE;
};

/**
 * Updates user status in the database
 *
 * @param userId - The user ID
 * @param onlineStatus - The new status to set
 * @throws Error if database update fails
 */
const updateUserStatusInDB = async (userId: string, onlineStatus: USER_ONLINE_STATUS): Promise<void> => {
    try {
        const updateData: Partial<IPerson> = {
            onlineStatus,
        };

        if (onlineStatus === "online") {
            updateData.lastOnline = new Date();
        }

        const [affectedRows] = await UserEntity.update(updateData, {
            where: { id: userId },
            returning: false, // Optimize for performance
        });

        if (affectedRows === 0) {
            console.warn(`No user found with ID ${userId} for status update`);
        } else {
            console.log(`Successfully updated user ${userId} status to: ${onlineStatus}`);
        }
    } catch (error) {
        console.error(`Database error updating user ${userId} status to ${onlineStatus}:`, error);
        throw error;
    }
};

/**
 * Initializes user status tracking when they establish a new connection
 *
 * This function sets the initial status as 'online' for the new connection
 * and triggers the overall status calculation and database update.
 *
 * @param userId - The user ID
 * @param connectionId - The connection ID
 * @throws Error if initialization fails
 */
export const initializeUserConnection = async (userId: string, connectionId: string): Promise<void> => {
    try {
        console.log(`Initializing connection ${connectionId} for user ${userId}`);

        // Set initial status as online
        await updateUserConnectionStatus(userId, connectionId, USER_ONLINE_STATUS.ONLINE);

        console.log(`Successfully initialized connection ${connectionId} for user ${userId}`);
    } catch (error) {
        console.error(`Failed to initialize user connection for ${userId}:`, error);
        throw error;
    }
};

/**
 * Gets the current status for a specific user
 *
 * @param userId - The user ID
 * @returns The current user status or null if user not found
 */
export const getUserStatus = (userId: string): USER_ONLINE_STATUS | null => {
    return userStatusCache.get(userId) || null;
};

/**
 * Gets all active connections for a user
 *
 * @param userId - The user ID
 * @returns Array of connection information
 */
export const getUserConnections = (userId: string): ConnectionStatusInfo[] => {
    const userConnections = userStatusStates.get(userId);
    if (!userConnections) {
        return [];
    }

    return Array.from(userConnections.values());
};

/**
 * Gets statistics about user status tracking
 *
 * @returns Object containing status tracking statistics
 */
export const getUserStatusStats = () => {
    const totalUsers = userStatusStates.size;
    const totalConnections = Array.from(userStatusStates.values()).reduce(
        (sum, connections) => sum + connections.size,
        0
    );

    const statusCounts = {
        online: 0,
        idle: 0,
        offline: 0,
    };

    userStatusCache.forEach(status => {
        statusCounts[status]++;
    });

    return {
        totalUsers,
        totalConnections,
        statusCounts,
        timestamp: Date.now(),
    };
};

/**
 * Cleans up user status tracking (useful for testing or shutdown)
 */
export const clearUserStatusTracking = (): void => {
    userStatusStates.clear();
    userStatusCache.clear();
    console.log("User status tracking cleared");
};
