// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { render } from "@react-email/render";
import React from "react";
import * as fs from "fs/promises";
import * as path from "path";
import { EmailTemplateEntity } from "@stacks/db";
import { sequelize } from "@stacks/db";
import { Op, QueryTypes } from "sequelize";
import { randomUUID } from "crypto";
import logger from "../utils/logger";

type TemplateType = string;
type Locale = string;

interface TemplateData {
    [key: string]: unknown;
}

interface TemplateConfigData {
    [tenantId: string]: {
        [templateType: string]: {
            [locale: string]: string;
        };
    };
}

interface CompiledTemplate {
    name: string;
    templateType: string;
    locale: string;
    tenant: string;
    subject: string;
    body: string;
    isActive: boolean;
    createdBy: string;
    updatedBy: string;
}

/** Escape regex meta characters so user keys can't break the substitution regex. */
export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Service responsible for compiling React email templates into HTML
 * and storing them in the database on application boot
 */
export class TemplateCompiler {
    private readonly templatesPath: string;

    constructor() {
        this.templatesPath = path.join(process.cwd(), "emails");
    }

    /**
     * Fetch all active tenants from the database, keyed by id.
     */
    private async fetchAllTenants(): Promise<Map<string, string>> {
        try {
            const rows = await sequelize.query<{ id: string; title: string }>(
                "SELECT id, title FROM tenants WHERE (disabled = false OR disabled IS NULL) AND expiry > NOW()",
                { type: QueryTypes.SELECT }
            );

            return new Map(rows.map(r => [String(r.id), r.title]));
        } catch (error) {
            logger.error("Failed to fetch tenants:", error);
            return new Map();
        }
    }

    /**
     * Compiles all email templates and stores them in the database.
     * Idempotent: existing rows are upserted on (templateType, tenant, locale)
     * and rows that no longer exist in source are deactivated rather than deleted.
     * This method should be called during application startup.
     */
    async compileAllTemplates(): Promise<void> {
        try {
            logger.info("🔨 Starting template compilation...");

            const systemUserId = await this.resolveSystemUserId();

            const tenantMap = await this.fetchAllTenants();
            logger.info(`🏢 Found ${tenantMap.size} tenants`);

            const templates = await this.loadTemplates();

            const { templateTypes, locales } = this.extractTemplateTypesAndLocales(templates);
            const compiledTemplates: CompiledTemplate[] = [];

            logger.info(`📋 Found template types: ${templateTypes.join(", ")}`);
            logger.info(`🌍 Found locales: ${locales.join(", ")}`);

            for (const tenantId of Object.keys(templates)) {
                const tenantTitle = tenantMap.get(tenantId) || tenantMap.get("default") || "Stacks";

                for (const templateType of templateTypes) {
                    for (const locale of locales) {
                        try {
                            const { html, subject } = await this.compileTemplate(
                                templateType,
                                locale,
                                tenantId,
                                templates,
                                tenantTitle
                            );

                            compiledTemplates.push({
                                name: `${templateType}_${locale}_${tenantId}`,
                                templateType,
                                locale,
                                tenant: tenantId,
                                subject,
                                body: html,
                                isActive: true,
                                createdBy: systemUserId,
                                updatedBy: systemUserId,
                            });

                            logger.info(`✅ Compiled ${templateType}_${locale} for tenant ${tenantId}`);
                        } catch (error) {
                            logger.error(
                                `❌ Failed to compile ${templateType}_${locale} for tenant ${tenantId}:`,
                                error
                            );
                        }
                    }
                }
            }

            await this.persistCompiledTemplates(compiledTemplates);

            logger.info("🎉 Template compilation completed successfully!");
        } catch (error) {
            logger.error("❌ Template compilation failed:", error);
            throw error;
        }
    }

    /**
     * Upsert compiled templates and deactivate any active templates that
     * are no longer represented in source.
     */
    private async persistCompiledTemplates(compiled: CompiledTemplate[]): Promise<void> {
        if (compiled.length === 0) {
            logger.warn("⚠️  No templates compiled, skipping persistence");
            return;
        }

        for (const tpl of compiled) {
            await EmailTemplateEntity.upsert(tpl as unknown as Record<string, unknown>);
        }

        const activeKeys = compiled.map(t => `${t.templateType}|${t.tenant}|${t.locale}`);
        const existing = await EmailTemplateEntity.findAll({
            where: { isActive: true },
            attributes: ["id", "templateType", "tenant", "locale"],
        });

        const stale = existing.filter(
            row => !activeKeys.includes(`${row.templateType}|${row.tenant}|${row.locale}`)
        );

        if (stale.length > 0) {
            await EmailTemplateEntity.update(
                { isActive: false },
                { where: { id: { [Op.in]: stale.map(s => s.id) } } }
            );
            logger.info(`🗑️  Deactivated ${stale.length} stale template(s)`);
        }

        logger.info(`✅ Stored ${compiled.length} compiled templates in database`);
    }

    /**
     * Look up the system user id, falling back to a generated UUID so the
     * audit columns stay populated even when no system user exists yet.
     */
    private async resolveSystemUserId(): Promise<string> {
        const [systemUser] = await sequelize.query<{ id: string }>(
            "SELECT id FROM users WHERE system = true LIMIT 1",
            { type: QueryTypes.SELECT }
        );
        if (systemUser?.id) {
            return systemUser.id;
        }
        logger.warn("⚠️  No system user found; using a generated UUID for audit columns");
        return randomUUID();
    }

    /**
     * Load templates configuration from JSON file
     */
    private async loadTemplates(): Promise<TemplateConfigData> {
        try {
            const subjectsPath = path.join(process.cwd(), "emails.json");
            const subjectsContent = await fs.readFile(subjectsPath, "utf-8");
            return JSON.parse(subjectsContent);
        } catch (error) {
            logger.error("Failed to load emails.json:", error);
            throw error;
        }
    }

    /**
     * Extract template types and locales dynamically from the templates data
     */
    private extractTemplateTypesAndLocales(templates: TemplateConfigData): {
        templateTypes: TemplateType[];
        locales: Locale[];
    } {
        const templateTypesSet = new Set<string>();
        const localesSet = new Set<string>();

        // Iterate through all tenants to collect unique template types and locales
        for (const tenantId of Object.keys(templates)) {
            const tenantData = templates[tenantId];

            for (const templateType of Object.keys(tenantData)) {
                templateTypesSet.add(templateType);

                for (const locale of Object.keys(tenantData[templateType])) {
                    localesSet.add(locale);
                }
            }
        }

        return {
            templateTypes: Array.from(templateTypesSet) as TemplateType[],
            locales: Array.from(localesSet) as Locale[],
        };
    }

    /**
     * Compiles a single template to HTML.
     * Resolves the source file by trying the build-time extension first
     * (.js when running from dist) and falling back to .tsx for dev runs.
     */
    private async compileTemplate(
        templateType: TemplateType,
        locale: Locale,
        tenantId: string,
        templates: TemplateConfigData,
        tenantTitle?: string
    ): Promise<{ html: string; subject: string }> {
        try {
            const templatePath = await this.resolveTemplatePath(templateType);
            const templateModule = await import(templatePath);

            const componentName = `${templateType
                .split("-")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join("")}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;

            const TemplateComponent = templateModule[componentName];

            if (!TemplateComponent) {
                throw new Error(`No export '${componentName}' found in ${path.basename(templatePath)}`);
            }

            const html = await render(React.createElement(TemplateComponent, { appName: tenantTitle }));

            const subject = this.getSubjectForTenant(templateType, locale, tenantId, templates, tenantTitle);

            return { html, subject };
        } catch (error) {
            logger.error(
                `Failed to compile template ${templateType}_${locale} for tenant ${tenantId}:`,
                error
            );
            throw error;
        }
    }

    /**
     * Resolve the template module path. Prefers .js when this code is running
     * from dist (production) and .tsx otherwise (tsx watch / dev).
     */
    private async resolveTemplatePath(templateType: TemplateType): Promise<string> {
        const isProd = __dirname.split(path.sep).includes("dist");
        const preferred = isProd ? ".js" : ".tsx";
        const fallback = isProd ? ".tsx" : ".js";

        const primary = path.join(this.templatesPath, `${templateType}${preferred}`);
        try {
            await fs.access(primary);
            return primary;
        } catch {
            const secondary = path.join(this.templatesPath, `${templateType}${fallback}`);
            await fs.access(secondary);
            return secondary;
        }
    }

    /**
     * Get the subject for a template from emails.json with tenant support
     */
    private getSubjectForTenant(
        templateType: TemplateType,
        locale: Locale,
        tenantId: string,
        templates: TemplateConfigData,
        tenantTitle?: string
    ): string {
        try {
            let subject = templates[tenantId]?.[templateType]?.[locale];

            if (!subject) {
                subject = templates["default"]?.[templateType]?.[locale];
            }

            if (!subject) {
                logger.warn(
                    `Subject not found for ${templateType}_${locale} (tenant: ${tenantId}), using fallback`
                );
                return `Email from ${tenantTitle || "App"}`;
            }

            return this.processTemplateVariables(subject, { appName: tenantTitle });
        } catch (error) {
            logger.error("Failed to get subject:", error);
            return `Email from ${tenantTitle || "App"}`;
        }
    }

    /**
     * Get a compiled template from the database with tenant support.
     * Falls back to default tenant and English locale if not found.
     */
    async getCompiledTemplate(
        templateType: TemplateType,
        locale: Locale,
        tenant: string = "default"
    ): Promise<InstanceType<typeof EmailTemplateEntity> | null> {
        try {
            let template = await EmailTemplateEntity.findOne({
                where: { templateType, locale, tenant, isActive: true },
            });

            if (!template && tenant !== "default") {
                logger.warn(
                    `Template ${templateType}_${locale} not found for tenant ${tenant}, falling back to default tenant`
                );
                template = await EmailTemplateEntity.findOne({
                    where: { templateType, locale, tenant: "default", isActive: true },
                });
            }

            if (!template && locale !== "en") {
                logger.warn(`Template ${templateType}_${locale} not found, falling back to English`);
                template = await EmailTemplateEntity.findOne({
                    where: { templateType, locale: "en", tenant, isActive: true },
                });

                if (!template && tenant !== "default") {
                    template = await EmailTemplateEntity.findOne({
                        where: { templateType, locale: "en", tenant: "default", isActive: true },
                    });
                }
            }

            return template;
        } catch (error) {
            logger.error(
                `Failed to get compiled template ${templateType}_${locale} for tenant ${tenant}:`,
                error
            );
            return null;
        }
    }

    /**
     * Replace `%key%` placeholders in the supplied string with values from `data`.
     * Keys are regex-escaped so unusual characters can't break the substitution.
     */
    processTemplateVariables(html: string, data: TemplateData): string {
        let processedHtml = html;

        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`%\\s*${escapeRegExp(key)}\\s*%`, "g");
            processedHtml = processedHtml.replace(regex, String(value ?? ""));
        }

        return processedHtml;
    }
}

export default TemplateCompiler;
