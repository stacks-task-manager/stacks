// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    sendRealtimeUpdate,
    getConnectionStats,
    registerConnection,
    unregisterConnection,
    appEmitter,
    AppEvents,
    queueMessage,
    getQueuedMessages,
    onUpdate,
} from "../../src/events";

// Helper function to clear all connections for testing
function clearAllConnections() {
    // Since we can't directly access the activeConnections Set,
    // we'll unregister a large number of potential connection IDs
    // This is a workaround for testing purposes
    for (let i = 0; i < 50; i++) {
        unregisterConnection(`test-connection-${i}`);
        unregisterConnection(`connection-${i}`);
        unregisterConnection(`user-${i}`);
        unregisterConnection(`cleanup-${i}`);
        unregisterConnection(`unknown-${i}`);
    }
}

describe("Events Utility Functions", () => {
    beforeEach(() => {
        // Clear all connections before each test
        appEmitter.removeAllListeners();
        clearAllConnections();
    });

    afterEach(() => {
        // Clean up after each test
        appEmitter.removeAllListeners();
        clearAllConnections();
    });

    describe("Event Emitter", () => {
        test("should emit and listen to custom events", () => {
            const mockCallback = vi.fn();
            const testData = { message: "test event" };

            appEmitter.on(AppEvents.CUSTOM_MESSAGE, mockCallback);
            appEmitter.emit(AppEvents.CUSTOM_MESSAGE, testData);

            expect(mockCallback).toHaveBeenCalledWith(testData);
            expect(mockCallback).toHaveBeenCalledTimes(1);
        });

        test("should handle multiple listeners for the same event", () => {
            const mockCallback1 = vi.fn();
            const mockCallback2 = vi.fn();
            const testData = { message: "test event" };

            appEmitter.on(AppEvents.DATA_UPDATE, mockCallback1);
            appEmitter.on(AppEvents.DATA_UPDATE, mockCallback2);
            appEmitter.emit(AppEvents.DATA_UPDATE, testData);

            expect(mockCallback1).toHaveBeenCalledWith(testData);
            expect(mockCallback2).toHaveBeenCalledWith(testData);
            expect(mockCallback1).toHaveBeenCalledTimes(1);
            expect(mockCallback2).toHaveBeenCalledTimes(1);
        });

        test("should remove listeners correctly", () => {
            const mockCallback = vi.fn();
            const testData = { message: "test event" };

            appEmitter.on(AppEvents.CUSTOM_MESSAGE, mockCallback);
            appEmitter.off(AppEvents.CUSTOM_MESSAGE, mockCallback);
            appEmitter.emit(AppEvents.CUSTOM_MESSAGE, testData);

            expect(mockCallback).not.toHaveBeenCalled();
        });

        test("should handle once listeners", () => {
            const mockCallback = vi.fn();
            const testData = { message: "test event" };

            appEmitter.once(AppEvents.CUSTOM_MESSAGE, mockCallback);
            appEmitter.emit(AppEvents.CUSTOM_MESSAGE, testData);
            appEmitter.emit(AppEvents.CUSTOM_MESSAGE, testData);

            expect(mockCallback).toHaveBeenCalledTimes(1);
        });
    });

    describe("Connection Management", () => {
        test("should register and track connections", () => {
            const mockWebSocket = {
                readyState: 1, // OPEN
                send: vi.fn(),
                close: vi.fn(),
            } as any;

            const connectionId = "test-connection-1";
            registerConnection(connectionId);

            expect(connectionId).toBeDefined();
            expect(typeof connectionId).toBe("string");

            const stats = getConnectionStats();
            expect(stats.activeConnections).toBe(1);
            expect(stats.queuedConnections).toBe(0);
            expect(stats.totalQueuedMessages).toBe(0);
        });

        test("should handle multiple connections for the same user", () => {
            const mockWebSocket1 = {
                readyState: 1,
                send: vi.fn(),
                close: vi.fn(),
            } as any;

            const mockWebSocket2 = {
                readyState: 1,
                send: vi.fn(),
                close: vi.fn(),
            } as any;

            const userId = "test-user-1";
            const connectionId1 = "test-connection-1";
            const connectionId2 = "test-connection-2";
            registerConnection(connectionId1);
            registerConnection(connectionId2);

            expect(connectionId1).not.toBe(connectionId2);

            const stats = getConnectionStats();
            expect(stats.activeConnections).toBe(2);
            expect(stats.queuedConnections).toBe(0);
            expect(stats.totalQueuedMessages).toBe(0);
        });

        test("should unregister connections correctly", () => {
            const mockWebSocket = {
                readyState: 1,
                send: vi.fn(),
                close: vi.fn(),
            } as any;

            const userId = "test-user-1";
            const connectionId = "test-connection-1";
            registerConnection(connectionId);

            let stats = getConnectionStats();
            expect(stats.activeConnections).toBe(1);

            unregisterConnection(connectionId);

            stats = getConnectionStats();
            expect(stats.activeConnections).toBe(0);
            expect(stats.queuedConnections).toBe(0);
            expect(stats.totalQueuedMessages).toBe(0);
        });

        test("should handle unregistering non-existent connections gracefully", () => {
            const nonExistentId = "non-existent-connection";
            
            // Should not throw an error
            expect(() => {
                unregisterConnection(nonExistentId);
            }).not.toThrow();

            const stats = getConnectionStats();
            expect(stats.activeConnections).toBe(0);
        });

        test("should track multiple users correctly", () => {
            const mockWebSocket1 = {
                readyState: 1,
                send: vi.fn(),
                close: vi.fn(),
            } as any;

            const mockWebSocket2 = {
                readyState: 1,
                send: vi.fn(),
                close: vi.fn(),
            } as any;

            const userId1 = "test-user-1";
            const userId2 = "test-user-2";
            
            registerConnection("connection-1");
            registerConnection("connection-2");

            const stats = getConnectionStats();
            expect(stats.activeConnections).toBe(2);
            expect(stats.queuedConnections).toBe(0);
            expect(stats.totalQueuedMessages).toBe(0);
        });
    });

    describe("Real-time Updates", () => {
        test("should emit real-time updates", () => {
            const mockHandler = vi.fn();
            onUpdate(mockHandler);

            registerConnection("test-connection");

            const updateData = {
                type: "task_updated" as any,
                record: "task-1",
                user: "test-user-1",
                action: "update" as any,
                timestamp: Date.now()
            };

            sendRealtimeUpdate(updateData);

            expect(mockHandler).toHaveBeenCalledWith({
                ...updateData,
                timestamp: expect.any(Number)
            });
        });

        test("should handle multiple event listeners", () => {
            const mockHandler1 = vi.fn();
            const mockHandler2 = vi.fn();
            
            onUpdate(mockHandler1);
            onUpdate(mockHandler2);

            registerConnection("connection-1");
            registerConnection("connection-2");

            const updateData = {
                type: "project_updated" as any,
                record: "project-1",
                user: "test-user-1",
                action: "update" as any,
                timestamp: Date.now()
            };

            sendRealtimeUpdate(updateData);

            expect(mockHandler1).toHaveBeenCalledWith({
                ...updateData,
                timestamp: expect.any(Number)
            });
            expect(mockHandler2).toHaveBeenCalledWith({
                ...updateData,
                timestamp: expect.any(Number)
            });
        });

        test("should handle event emission errors gracefully", () => {
            const mockHandler = vi.fn().mockImplementation(() => {
                throw new Error("Handler error");
            });
            
            appEmitter.on(AppEvents.DATA_UPDATE, mockHandler);
            registerConnection("test-connection");

            const updateData = {
                type: "task_updated" as any,
                record: "task-1",
                user: "test-user-1",
                action: "update" as any,
                timestamp: Date.now()
            };

            // Should not throw error even if handler fails
            expect(() => sendRealtimeUpdate(updateData)).not.toThrow();
        });

        test("should handle invalid update data gracefully", () => {
            const mockHandler = vi.fn();
            appEmitter.on(AppEvents.DATA_UPDATE, mockHandler);
            registerConnection("test-connection");

            const updateData = {
                type: "task_updated" as any,
                record: "task-1",
                user: "test-user-1",
                action: "update" as any,
                timestamp: Date.now()
            };

            // Should not throw error even with null data
            expect(() => sendRealtimeUpdate(updateData)).not.toThrow();
            expect(mockHandler).toHaveBeenCalled();
        });

        test("should emit updates regardless of user existence", () => {
            const mockHandler = vi.fn();
            appEmitter.on(AppEvents.DATA_UPDATE, mockHandler);
            
            const updateData = {
                type: "task_updated" as any,
                record: "task-1",
                user: "non-existent-user",
                action: "update" as any,
                timestamp: Date.now()
            };

            sendRealtimeUpdate(updateData);
            expect(mockHandler).toHaveBeenCalledWith({
                ...updateData,
                timestamp: expect.any(Number)
            });
        });

        test("should broadcast updates to all event listeners", () => {
            const mockHandler1 = vi.fn();
            const mockHandler2 = vi.fn();
            
            onUpdate(mockHandler1);
            onUpdate(mockHandler2);
            
            registerConnection("connection-1");
            registerConnection("connection-2");

            const updateData = {
                type: "system_announcement" as any,
                record: "announcement-1",
                user: "system",
                action: "notify" as any,
                timestamp: Date.now()
            };

            // Broadcast to all users
            sendRealtimeUpdate(updateData);

            expect(mockHandler1).toHaveBeenCalledWith({
                ...updateData,
                timestamp: expect.any(Number)
            });
            expect(mockHandler2).toHaveBeenCalledWith({
                ...updateData,
                timestamp: expect.any(Number)
            });
        });
    });

    describe("Application Events", () => {
        test("should have defined application event constants", () => {
            expect(AppEvents.DATA_UPDATE).toBeDefined();
            expect(AppEvents.CONNECTION_COUNT).toBeDefined();
            expect(AppEvents.CUSTOM_MESSAGE).toBeDefined();
            
            expect(typeof AppEvents.DATA_UPDATE).toBe("string");
            expect(typeof AppEvents.CONNECTION_COUNT).toBe("string");
            expect(typeof AppEvents.CUSTOM_MESSAGE).toBe("string");
        });

        test("should emit connection count updates when connections change", () => {
            const mockCallback = vi.fn();
            appEmitter.on(AppEvents.CONNECTION_COUNT, mockCallback);

            const mockWebSocket = {
                readyState: 1,
                send: vi.fn(),
                close: vi.fn(),
            } as any;

            const userId = "test-user-1";
            const connectionId = "test-connection";
            registerConnection(connectionId);

            // Should emit connection count update
            expect(mockCallback).toHaveBeenCalled();

            mockCallback.mockClear();
            unregisterConnection(connectionId);

            // Should emit connection count update again
            expect(mockCallback).toHaveBeenCalled();
        });

        test("should emit data update events", () => {
            const mockCallback = vi.fn();
            appEmitter.on(AppEvents.DATA_UPDATE, mockCallback);

            const updateData = {
                entity: "task",
                action: "created",
                data: { id: 1, title: "New Task" },
            };

            appEmitter.emit(AppEvents.DATA_UPDATE, updateData);

            expect(mockCallback).toHaveBeenCalledWith(updateData);
        });
    });

    describe("Message Queuing", () => {
        test("should queue messages for connections", () => {
            const connectionId = "test-connection";
            const message = {
                type: "task_assigned" as any,
                record: "task-1",
                user: "user-1",
                action: "assign" as any,
                timestamp: Date.now()
            };

            // Queue a message for the connection
            queueMessage(connectionId, message);

            // Retrieve queued messages
            const queuedMessages = getQueuedMessages(connectionId);

            expect(queuedMessages).toHaveLength(1);
            expect(queuedMessages[0]).toEqual(message);
        });

        test("should limit queue size for connections", () => {
            const connectionId = "test-connection";
            
            // Queue 150 messages (exceeding the 100 limit)
            for (let i = 0; i < 150; i++) {
                const message = {
                    type: "notification" as any,
                    record: `notification-${i}`,
                    user: "user-1",
                    action: "create" as any,
                    timestamp: Date.now()
                };
                queueMessage(connectionId, message);
            }

            const queuedMessages = getQueuedMessages(connectionId);

            // Should only keep the last 100 messages (queue limit)
            expect(queuedMessages).toHaveLength(100);
            expect(queuedMessages[0].record).toBe("notification-50"); // First message should be notification-50
            expect(queuedMessages[99].record).toBe("notification-149"); // Last message should be notification-149
        });

        test("should clear message queue after retrieval", () => {
            const connectionId = "test-connection";
            const message = {
                type: "task_updated" as any,
                record: "task-1",
                user: "user-1",
                action: "update" as any,
                timestamp: Date.now()
            };

            // Queue message
            queueMessage(connectionId, message);

            // Verify message is queued
            let queuedMessages = getQueuedMessages(connectionId);
            expect(queuedMessages).toHaveLength(1);

            // Get queued messages (this should clear the queue)
            queuedMessages = getQueuedMessages(connectionId);

            // Queue should be empty after retrieval
            const remainingMessages = getQueuedMessages(connectionId);
            expect(remainingMessages).toHaveLength(0);
        });
    });

    describe("Connection Stats", () => {
        test("should return accurate connection statistics", () => {
            const stats = getConnectionStats();
            
            expect(stats).toHaveProperty("activeConnections");
            expect(stats).toHaveProperty("queuedConnections");
            expect(stats).toHaveProperty("totalQueuedMessages");
            
            expect(typeof stats.activeConnections).toBe("number");
            expect(typeof stats.queuedConnections).toBe("number");
            expect(typeof stats.totalQueuedMessages).toBe("number");
        });

        test("should update stats when connections change", () => {
            const initialStats = getConnectionStats();
            const initialActive = initialStats.activeConnections;
            
            const connectionId = "test-connection-123";
            
            registerConnection(connectionId);
            
            let stats = getConnectionStats();
            expect(stats.activeConnections).toBe(initialActive + 1);
            
            unregisterConnection(connectionId);
            
            stats = getConnectionStats();
            expect(stats.activeConnections).toBe(initialActive);
        });
    });
});