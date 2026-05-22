// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Server utility functions
 */

// Re-export real-time update functionality for easy access
export {
    sendRealtimeUpdate,
    getConnectionStats,
    registerConnection,
    unregisterConnection
} from './events';