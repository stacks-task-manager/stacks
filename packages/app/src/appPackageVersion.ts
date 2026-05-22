// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import packageJson from "../package.json";

/** `version` from `packages/app/package.json`, bundled at compile time. */
export const APP_PACKAGE_VERSION: string = packageJson.version;
