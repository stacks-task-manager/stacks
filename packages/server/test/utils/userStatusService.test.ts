// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import {
    updateUserConnectionStatus,
    removeUserConnectionStatus,
    initializeUserConnection,
    getUserStatus,
    getUserConnections,
    getUserStatusStats,
    clearUserStatusTracking,
    type UserStatus,
} from "../../src/services/userStatusService";
import { UserEntity } from "@stacks/db";
import { appEmitter, AppEvents } from "../../src/events";

// Mock dependencies
vi.mock("@stacks/db", () => ({
    UserEntity: {
        update: vi.fn().mockResolvedValue([1]),
    },
}));
vi.mock("../../src/events");
vi.mock("../../src/routes/socket", () => ({
    getUserConnectionCount: vi.fn().mockReturnValue(1)
}));

const mockAppEmitter = appEmitter as any;

// Helper to access mocked UserEntity
const mockUserEntity = UserEntity as any;

describe("User Status Service", () => {
    const mockUserId = "user-123";
    const mockConnectionId = "conn-456";
    
    beforeEach(() => {
        vi.clearAllMocks();
        clearUserStatusTracking();
        
        // Setup default mocks
        mockUserEntity.update.mockResolvedValue([1]);
        
        mockAppEmitter.emit = vi.fn();
    });
    
    afterEach(() => {
        clearUserStatusTracking();
    });

    describe("updateUserConnectionStatus", () => {
        test("should update user connection status to online", async () => {
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "online");
            
            const status = getUserStatus(mockUserId);
            expect(status).toBe("online");
            
            const connections = getUserConnections(mockUserId);
            expect(connections).toHaveLength(1);
            expect(connections[0].status).toBe("online");
            expect(connections[0].connectionId).toBe(mockConnectionId);
        });
        
        test("should update user connection status to idle", async () => {
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "idle");
            
            const status = getUserStatus(mockUserId);
            expect(status).toBe("idle");
        });
        
        test("should handle multiple connections for same user", async () => {
            const connectionId2 = "conn-789";
            
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "online");
            await updateUserConnectionStatus(mockUserId, connectionId2, "idle");
            
            const status = getUserStatus(mockUserId);
            expect(status).toBe("online"); // online takes priority over idle
            
            const connections = getUserConnections(mockUserId);
            expect(connections).toHaveLength(2);
        });
        
        test("should update database when status changes", async () => {
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "online");
            
            const calls = (mockUserEntity.update as Mock).mock.calls;
            expect(calls.length).toBeGreaterThan(0);
            const [updateData, options] = calls[0];
            expect(options).toMatchObject({ where: { id: mockUserId }, returning: false });
            expect(updateData).toMatchObject({ onlineStatus: "online" });
        });
        
        test("should emit status change event", async () => {
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "online");
            
            expect(mockAppEmitter.emit).toHaveBeenCalledWith(
                AppEvents.CUSTOM_MESSAGE,
                expect.objectContaining({
                    userId: mockUserId,
                    status: "online"
                })
            );
        });
    });

    describe("removeUserConnectionStatus", () => {
        test("should remove connection and update status", async () => {
            // First add a connection
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "online");
            expect(getUserStatus(mockUserId)).toBe("online");
            
            // Then remove it
            await removeUserConnectionStatus(mockUserId, mockConnectionId);
            
            const status = getUserStatus(mockUserId);
            expect(status).toBe(null);
            
            const connections = getUserConnections(mockUserId);
            expect(connections).toHaveLength(0);
        });
        
        test("should handle removing non-existent connection", async () => {
            await removeUserConnectionStatus(mockUserId, "non-existent-conn");
            
            const status = getUserStatus(mockUserId);
            expect(status).toBe(null);
        });
        
        test("should maintain status when other connections exist", async () => {
            const connectionId2 = "conn-789";
            
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "online");
            await updateUserConnectionStatus(mockUserId, connectionId2, "idle");
            
            await removeUserConnectionStatus(mockUserId, mockConnectionId);
            
            const status = getUserStatus(mockUserId);
            expect(status).toBe("idle");
            
            const connections = getUserConnections(mockUserId);
            expect(connections).toHaveLength(1);
        });
    });

    describe("initializeUserConnection", () => {
        test("should initialize user connection as online", async () => {
            await initializeUserConnection(mockUserId, mockConnectionId);
            
            const status = getUserStatus(mockUserId);
            expect(status).toBe("online");
            
            const connections = getUserConnections(mockUserId);
            expect(connections).toHaveLength(1);
            expect(connections[0].status).toBe("online");
        });
    });

    describe("getUserStatus", () => {
        test("should return null for user with no connections", () => {
            const status = getUserStatus(mockUserId);
            expect(status).toBe(null);
        });
        
        test("should return correct status for user with connections", async () => {
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "idle");
            
            const status = getUserStatus(mockUserId);
            expect(status).toBe("idle");
        });
    });

    describe("getUserConnections", () => {
        test("should return empty array for user with no connections", () => {
            const connections = getUserConnections(mockUserId);
            expect(connections).toEqual([]);
        });
        
        test("should return all connections for user", async () => {
            const connectionId2 = "conn-789";
            
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "online");
            await updateUserConnectionStatus(mockUserId, connectionId2, "idle");
            
            const connections = getUserConnections(mockUserId);
            expect(connections).toHaveLength(2);
            
            const connectionIds = connections.map(c => c.connectionId);
            expect(connectionIds).toContain(mockConnectionId);
            expect(connectionIds).toContain(connectionId2);
        });
    });

    describe("getUserStatusStats", () => {
        test("should return stats about tracked users", async () => {
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "online");
            await updateUserConnectionStatus("user-456", "conn-789", "idle");
            
            const stats = getUserStatusStats();
            expect(stats.totalUsers).toBe(2);
            expect(stats.totalConnections).toBe(2);
        });
        
        test("should return zero stats when no users tracked", () => {
            const stats = getUserStatusStats();
            expect(stats.totalUsers).toBe(0);
            expect(stats.totalConnections).toBe(0);
        });
    });

    describe("clearUserStatusTracking", () => {
        test("should clear all tracking data", async () => {
            await updateUserConnectionStatus(mockUserId, mockConnectionId, "online");
            expect(getUserStatus(mockUserId)).toBe("online");
            
            clearUserStatusTracking();
            
            expect(getUserStatus(mockUserId)).toBe(null);
            expect(getUserConnections(mockUserId)).toEqual([]);
            
            const stats = getUserStatusStats();
            expect(stats.totalUsers).toBe(0);
            expect(stats.totalConnections).toBe(0);
        });
    });
});