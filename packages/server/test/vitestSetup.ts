// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Runs in the Vitest test worker (not in globalSetup, which is a separate process).
 * NODE_ENV=test skips server license init; without this, routes that call getLicense() (e.g. /api/boot) fail.
 */
import { __setLicenseForTests } from "@stacks/license";
import { TEST_LICENSE } from "./helpers/testLicense";

__setLicenseForTests(TEST_LICENSE);

// Existing auth-flow tests exercise enabled behavior; flag parser and disabled-policy tests override these locally.
process.env.REGISTRATION_ENABLED = "true";
process.env.PASSWORD_RECOVERY_ENABLED = "true";
