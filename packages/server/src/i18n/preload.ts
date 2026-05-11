// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Side-effect import: registers request-scoped i18n then eagerly loads locale JSON on startup.
 */
import "./requestScope";
import { preloadLocales } from "./locales";

preloadLocales();
