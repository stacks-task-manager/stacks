// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Liveness probe returning a static JSON payload.
 */
import { Hono } from 'hono';

const ping = new Hono();

/** GET `/` — Returns `{ message: "pong" }`. */
ping.get('/', async (c) => {
    return c.json({ message: 'pong' });
});

export default ping;