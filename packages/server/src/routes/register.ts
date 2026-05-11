// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * HTML registration page listing available tenants.
 */
import { TenantEntity } from "@stacks/db";
import { Hono } from "hono";

const register = new Hono();

/** GET `/` — Renders the register template with tenant options. */
register.get("/", async c => {
    try {
        const tenantsEntities = await TenantEntity.findAll();
        const tenants = tenantsEntities.map(tenant => ({
            id: tenant.get("id"),
            title: tenant.get("title"),
        }));

        return c.replyHtml("register", { tenants });
    } catch (error) {
        return c.text("Register page not found", 404);
    }
});

export default register;
