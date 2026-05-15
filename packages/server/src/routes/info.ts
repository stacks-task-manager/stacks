// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Public license / source disclosure endpoint.
 *
 * Stacks is licensed under the GNU AGPL v3.0. Section 13 of the AGPL requires
 * operators of a network-deployed modified version to offer remote users
 * access to the corresponding source code "through some standard or customary
 * means of facilitating copying of software." This endpoint is one such
 * standard means: it returns the license name and a pointer to the source.
 *
 * IF YOU FORK STACKS AND HOST A MODIFIED VERSION, update SOURCE_URL below to
 * point to YOUR source code repository (not the upstream one). Failing to do
 * so is an AGPL violation.
 */
import { Hono } from "hono";

import packageJson from "../../package.json";

const info = new Hono();

const SOURCE_URL =
    process.env.STACKS_SOURCE_URL ??
    "https://github.com/stacks-task-manager/stacks";

const COMMIT_SHA = process.env.STACKS_COMMIT_SHA ?? null;

info.get("/", c => {
    return c.json({
        name: "Stacks",
        license: "AGPL-3.0-only",
        licenseUrl: "https://www.gnu.org/licenses/agpl-3.0.html",
        sourceUrl: SOURCE_URL,
        version: packageJson.version,
        commitSha: COMMIT_SHA,
        notice:
            "This software is licensed under the GNU AGPL v3.0. " +
            "If you are running a modified version as a network service, " +
            "you are required to offer your users access to the corresponding source code.",
    });
});

export default info;
