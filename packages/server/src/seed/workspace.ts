// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Imports a workspace snapshot from `import/workspace` (roles, projects, tasks, files).
 */
import {
    CompanyEntity,
    DocumentEntity,
    ProjectEntity,
    RoleEntity,
    sequelize,
    StackEntity,
    TaskEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import * as bcrypt from "bcryptjs";
import { existsSync, readdirSync, readFileSync, renameSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { getLicense } from "@stacks/license";
import { translate } from "@stacks/translations";
import { IPermissions, POLLINGTYPE } from "@stacks/types";
import { FilesLoader } from "../loaders";
import { getMimeType } from "../utils/files";

const WORKSPACE_PATH = join(process.cwd(), "import", "workspace");

/** Logs Sequelize/Postgres diagnostics for failed bulk inserts. */
const logSequelizeError = (label: string, err: any) => {
    console.error(`❌ ${label}`);
    console.error({
        name: err?.name,
        message: err?.message,
        sql: err?.sql,
        parameters: err?.parameters,
        // Postgres driver fields
        code: err?.original?.code,
        detail: err?.original?.detail,
        hint: err?.original?.hint,
        schema: err?.original?.schema,
        table: err?.original?.table,
        column: err?.original?.column,
        constraint: err?.original?.constraint,
        position: err?.original?.position,
        where: err?.original?.where,
        file: err?.original?.file,
        line: err?.original?.line,
        routine: err?.original?.routine,
    });
};

/** Reads JSON bundles under {@link WORKSPACE_PATH} and upserts into the DB. */
export const workspaceSeed = async () => {
    try {
        console.log("🗄️ Starting workspace import seeding...");
        const transaction = await sequelize.transaction();
        const license = getLicense();
        const tenantLicense = license.tenants[0];
        if (!tenantLicense) {
            console.error("Tenant license not found");
            return;
        }

        const tenant = await TenantEntity.findOne({
            where: {
                id: tenantLicense.id,
            },
        });
        if (!tenant) {
            console.error(translate("Tenant not found"));
            return;
        }
        if (tenant.get("disabled")) {
            console.error("Tenant is disabled");
            return;
        }

        const people: Record<string, any> = {};
        const companies: Record<string, any> = {};
        const tags: Record<string, any> = {};
        const statuses: Record<string, any> = {};
        const documents: Record<string, any> = {};
        const projects: Record<string, any> = {};
        const projectStacks: Record<string, any> = {};
        const projectTasks: Record<string, any> = {};
        const attachments: Record<string, any> = {};
        const activities = [];
        const permissions: IPermissions[] = [];

        if (!existsSync(WORKSPACE_PATH)) {
            console.log(`⚠️ Skipping workspace import: missing workspace directory (${WORKSPACE_PATH})`);
            return;
        }

        const adminUser = await UserEntity.findOne({
            where: {
                admin: true,
                tenant: tenant.get("id"),
            },
        });
        if (!adminUser) {
            console.error("⚠️ Skipping workspace import: Admin user not found");
            return;
        }

        if (adminUser.get("disabled")) {
            console.error("⚠️ Skipping workspace import: Admin user is disabled");
            return;
        }

        const addPermission = (id: string, type: POLLINGTYPE) => {
            permissions.push({
                id,
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
                owner: `${adminUser.get("id")}`,
                type,
            });
        };

        const TASKS_PATH = join(WORKSPACE_PATH, "tasks");

        const TREE_PATH = join(WORKSPACE_PATH, "documents.tree");
        if (!existsSync(TREE_PATH)) {
            return;
        }

        let treeData;
        try {
            treeData = JSON.parse(readFileSync(TREE_PATH, "utf8"));

            // STATUSES
            for (const status of treeData.statuses) {
                statuses[status.id] = {
                    ...status,
                    id: randomUUID(),
                    createdBy: adminUser.get("id"),
                    updatedBy: adminUser.get("id"),
                };
            }

            // TAGS
            for (const tag of treeData.tags) {
                tags[tag.id] = {
                    ...tag,
                    id: randomUUID(),
                    createdBy: adminUser.get("id"),
                    updatedBy: adminUser.get("id"),
                };
            }
        } catch (e: any) {
            console.error("⚠️ Skipping workspace import: Error parsing documents tree data", e);
            return;
        }

        // PEOPLE
        const PEOPLE_PATH = join(WORKSPACE_PATH, "people");
        if (!existsSync(PEOPLE_PATH)) {
            return;
        }

        // ROLES
        const role = await RoleEntity.findOne({
            where: {
                title: "User",
                tenant: tenant.get("id"),
            },
            raw: true,
        });
        if (!role) {
            console.log("⚠️ Skipping workspace import: User role not found");
            return;
        }

        // PEOPLE
        try {
            const peopleData = JSON.parse(readFileSync(PEOPLE_PATH, "utf8"));
            for (const person of peopleData) {
                const { status: personStatus, tags: personTags, email, company, ...rest } = person;
                const salt = await bcrypt.genSalt(10);
                const password = await bcrypt.hash(randomUUID(), salt);

                if (email) {
                    const { count } = await UserEntity.findAndCountAll({
                        where: {
                            email,
                            tenant: tenantLicense.id,
                        },
                    });

                    if (count > 0) {
                        console.log(`⚠️ Skipping workspace import: User with email ${email} already exists`);
                        continue;
                    }
                }

                people[person.id] = {
                    ...rest,
                    id: randomUUID(),
                    email: email ?? `${randomUUID()}@example.com`,
                    password,
                    company: companies[company]?.id ?? null,
                    role: role.id,
                    tags: personTags
                        ? personTags
                              .filter((tagId: string) => tags[tagId])
                              .map((tagId: string) => tags[tagId].id)
                        : [],
                    status: statuses[personStatus]?.id ?? null,
                    tenant: tenantLicense.id,
                    createdBy: adminUser.get("id"),
                    updatedBy: adminUser.get("id"),
                };
            }
        } catch (e: any) {
            console.error("⚠️ Skipping workspace import: Error parsing people data", e);
            return;
        }

        /* COMPANIES */
        const COMPANIES_PATH = join(WORKSPACE_PATH, "companies");
        if (!existsSync(COMPANIES_PATH)) {
            return;
        }

        try {
            const companiesData = JSON.parse(readFileSync(COMPANIES_PATH, "utf8"));
            for (const company of companiesData) {
                companies[company.id] = {
                    ...company,
                    id: randomUUID(),
                    tenant: tenantLicense.id,
                    createdBy: adminUser.get("id"),
                    updatedBy: adminUser.get("id"),
                };
            }
        } catch (e: any) {
            console.error("⚠️ Skipping workspace import: Error parsing companies data", e);
            return;
        }

        const defaultParent = "00000000-0000-0000-0000-000000000000";

        const sortedDocuments = treeData.documents
            .sort((a: any, b: any) => Number(b.droppable) - Number(a.droppable))
            .sort((a: any, b: any) => (`${a.parent}`.length < `${b.parent}`.length ? -1 : 1));

        for (const document of sortedDocuments) {
            const documentId = randomUUID();
            const oldDocumentId = document.data.type === "folder" ? document.id : document.data.document;

            documents[oldDocumentId] = {
                id: documentId,
                title: document.text,
                parent: document.parent === 0 ? defaultParent : documents[document.parent]?.id,
                type: document.data.type,
                tenant: tenantLicense.id,
                createdBy: adminUser.get("id"),
                updatedBy: adminUser.get("id"),
            };
            addPermission(documentId, POLLINGTYPE.DOCUMENT);

            // PROJECT
            if (document.data.type === "project") {
                const PROJECT_PATH = join(WORKSPACE_PATH, `${document.data.document}.project`);
                if (!existsSync(PROJECT_PATH)) {
                    continue;
                }

                let projectData;
                try {
                    projectData = JSON.parse(readFileSync(PROJECT_PATH, "utf8"));
                } catch (e: any) {
                    console.error(
                        `⚠️ Skipping workspace import: Error parsing project data: ${PROJECT_PATH}`,
                        e
                    );
                    continue;
                }
                projects[projectData.id] = {
                    id: documents[projectData.id].id,
                    description: projectData.description ?? "",
                    startDate: projectData.startDate,
                    endDate: projectData.endDate,
                    hourlyRate: projectData.hourlyFee,
                    currency: projectData.feeCurrency,
                    projectOwner: people[projectData.projectOwner]?.id ?? null,
                    automations: projectData.automations,
                    includeSubtasks: projectData.showSubtasks,
                    health: projectData.health,
                    company: companies[projectData.company]?.id ?? null,
                    tenant: tenantLicense.id,
                    created: projectData.created ?? new Date(),
                    updated: projectData.updated ?? new Date(),
                    createdBy: adminUser.get("id"),
                    updatedBy: adminUser.get("id"),
                };

                // STACKS
                let position = 0;
                for (const stack of projectData.stacks) {
                    const stackId = randomUUID();
                    projectStacks[stack.id] = {
                        id: stackId,
                        title: stack.title,
                        project: projects[projectData.id].id,
                        tint: stack.tint,
                        collapsed: stack.collapsed,
                        position,
                        tenant: tenantLicense.id,
                        createdBy: adminUser.get("id"),
                        updatedBy: adminUser.get("id"),
                    };
                    addPermission(stackId, POLLINGTYPE.STACK);
                    position++;

                    // TASKS
                    let taskPosition = 0;
                    for (const taskId of stack.tasks) {
                        const TASK_PATH = join(TASKS_PATH, `${taskId}.task`);
                        if (!existsSync(TASK_PATH)) {
                            continue;
                        }

                        const newTaskId = randomUUID();
                        let task;
                        try {
                            task = JSON.parse(readFileSync(TASK_PATH, "utf8"));

                            const {
                                public: isPublic,
                                owner,
                                visibleUsers,
                                visibleRoles,
                                archived,
                                ...rest
                            } = task;

                            if (!attachments[taskId]) {
                                attachments[taskId] = {};
                            }

                            // ATTACHMENTS
                            const TASK_ATTACHMENTS_PATH = join(WORKSPACE_PATH, "files", "tasks", taskId);
                            if (existsSync(TASK_ATTACHMENTS_PATH)) {
                                try {
                                    const files = readdirSync(TASK_ATTACHMENTS_PATH);

                                    for (const file of files) {
                                        const filePath = join(TASK_ATTACHMENTS_PATH, file);
                                        if (!existsSync(filePath)) {
                                            continue;
                                        }

                                        const buffer = readFileSync(filePath);
                                        const user = adminUser.toJSON();
                                        const mimeType = getMimeType(file);

                                        if (!mimeType) {
                                            continue;
                                        }

                                        attachments[taskId][file] = await FilesLoader.uploadFile(
                                            buffer,
                                            file,
                                            mimeType,
                                            newTaskId,
                                            "task_attachment",
                                            user,
                                            transaction
                                        );
                                    }
                                } catch (e) {
                                    console.error(`❌ Error seeding task ${taskId} attachments:`, e);
                                }
                            }

                            let description = task.description ?? "";

                            const workspaceFileRegex = new RegExp(
                                `workspace://files/tasks/${taskId}/([^\\s"]+)`,
                                "g"
                            );
                            let match;
                            const replacements: { from: string; to: string }[] = [];
                            while ((match = workspaceFileRegex.exec(description)) !== null) {
                                const fileName = match[1];

                                if (attachments[taskId] && attachments[taskId][fileName]) {
                                    const from = `workspace://files/tasks/${taskId}/${fileName}`;
                                    const to = `/api/files/preview/${attachments[taskId][fileName].id}?size=large`;
                                    replacements.push({ from, to });
                                }
                            }
                            // Apply replacements in reverse order to preserve indices
                            for (const { from, to } of replacements.reverse()) {
                                description = description.replace(from, to);
                            }

                            projectTasks[taskId] = {
                                ...rest,
                                description,
                                id: newTaskId,
                                title: task.title,
                                project: projects[projectData.id].id,
                                stack: projectStacks[stack.id].id,
                                status: statuses[task.status]?.id ?? null,
                                assignees: task.assignees
                                    ? task.assignees.map((assigneeId: string) => people[assigneeId].id)
                                    : [],
                                tags: task.tags
                                    ? task.tags
                                          .filter((tagId: string) => tags[tagId])
                                          .map((tagId: string) => tags[tagId].id)
                                    : [],
                                position: taskPosition,
                                archived: null,
                                tenant: tenantLicense.id,
                                createdBy: adminUser.get("id"),
                                updatedBy: adminUser.get("id"),
                            };
                            addPermission(newTaskId, POLLINGTYPE.TASK);
                            taskPosition++;
                        } catch (e) {
                            console.error(`❌ Error seeding task ${taskId}: (${TASK_PATH})`, e, task);
                            continue;
                        }

                        // ACTIVITIES
                        const TASKS_ACTIVITIES_PATH = join(TASKS_PATH, "activities", `${taskId}.activity`);
                        if (existsSync(TASKS_ACTIVITIES_PATH)) {
                            const ACTIVITY_PATH = join(TASKS_ACTIVITIES_PATH, `${taskId}.activity`);
                            if (existsSync(ACTIVITY_PATH)) {
                                try {
                                    const activity = JSON.parse(readFileSync(ACTIVITY_PATH, "utf8"));
                                    activities.push({
                                        resourceId: newTaskId,
                                        resourceType: "task",
                                        parent: projects[projectData.id].id,
                                        content: activity.content ?? "",
                                        type: activity.type ?? "comment",
                                        change: activity.change ?? {},
                                        person: people[activity.person]?.id ?? adminUser.get("id"),
                                        tenant: tenantLicense.id,
                                        createdBy: people[activity.person]?.id ?? adminUser.get("id"),
                                        updatedBy: people[activity.person]?.id ?? adminUser.get("id"),
                                    });
                                } catch (e) {
                                    console.error(`❌ Error seeding task ${taskId} activities:`, e);
                                }
                            }
                        }
                    }
                }
            }
        }

        try {
            const bulkOptions = {
                transaction,
                validate: true,
                individualHooks: true,
                // logging: (sql: string) => console.log(`[SQL] ${sql}`),
                returning: false,
            } as const;

            await UserEntity.bulkCreate(Object.values(people), bulkOptions);
            await CompanyEntity.bulkCreate(Object.values(companies), bulkOptions);
            await DocumentEntity.bulkCreate(Object.values(documents), bulkOptions);
            await ProjectEntity.bulkCreate(Object.values(projects), bulkOptions);
            await StackEntity.bulkCreate(Object.values(projectStacks), bulkOptions);
            await TaskEntity.bulkCreate(Object.values(projectTasks), bulkOptions);

            await transaction.commit();

            // Rename the workspace folder by appending "-imported_<timestamp>"
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const newWorkspaceName = `${WORKSPACE_PATH}-imported_${timestamp}`;
            renameSync(WORKSPACE_PATH, newWorkspaceName);
            console.log("✅ Workspace import finished");
        } catch (error) {
            await transaction.rollback();
            logSequelizeError("Seeding failed", error);
            throw error;
        }
    } catch (error) {
        console.error("❌ Error seeding workspace:", error);
    }
};
