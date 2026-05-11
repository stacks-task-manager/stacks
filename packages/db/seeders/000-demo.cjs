// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Constants for demo data files
const DEMO_FILES = {
    USERS: "people.json",
    COMPANIES: "companies.json",
    PROJECT: "project.json",
    TASKS: "tasks.json",
    TAGS: "tags.json",
    TIMELOGS: "timelogs.json",
};

// Role mapping for demo data
const ROLE_MAPPING = {
    "role-cto-uuid": crypto.randomUUID(),
    "role-engineer-uuid": crypto.randomUUID(),
    "role-consultant-uuid": crypto.randomUUID(),
    "role-pm-uuid": crypto.randomUUID(),
    "role-creative-director-uuid": crypto.randomUUID(),
    "role-designer-uuid": crypto.randomUUID(),
    "role-cmo-uuid": crypto.randomUUID(),
    "role-architect-uuid": crypto.randomUUID(),
    "role-developer-uuid": crypto.randomUUID(),
    "role-operations-uuid": crypto.randomUUID(),
    "role-qa-uuid": crypto.randomUUID(),
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log("🌱 Starting demo seeding...");

            // Initialize helper functions and state
            const helpers = createHelpers(queryInterface, transaction);
            const state = { importedUsers: [], tenant: null, order: 0 };

            // Define paths
            const paths = createPaths(__dirname);

            // Execute seeding steps
            await seedTenant(helpers, state);
            await seedUsers(helpers, state, paths);
            await seedCompanies(helpers, state, paths);
            await seedDemoFolder(helpers, state);
            await seedProjects(helpers, state, paths);
            await seedNotepads(helpers, state, paths);

            await transaction.commit();
            console.log("✅ Successfully seeded the demo data");
        } catch (error) {
            await transaction.rollback();
            console.error("❌ Error seeding demo:", error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log("🧹 Starting demo data cleanup...");

            // Get the demo tenant ID first
            const [tenants] = await queryInterface.sequelize.query(
                `SELECT id FROM "tenants" WHERE title = 'Demo'`,
                { transaction }
            );

            if (tenants.length === 0) {
                console.log("ℹ️  No demo tenant found, nothing to clean up");
                await transaction.commit();
                return;
            }

            const demoTenantId = tenants[0].id;
            console.log(`🎯 Found demo tenant: ${demoTenantId}`);

            // Delete in reverse dependency order to avoid foreign key constraints

            // 1. Delete timelogs (depends on projects, users)
            console.log("- Deleting timelogs...");
            await queryInterface.bulkDelete(
                "timelogs",
                {
                    tenant: demoTenantId,
                },
                { transaction }
            );

            // 2. Delete tasks (depends on projects, stacks, users)
            console.log("- Deleting tasks...");
            await queryInterface.bulkDelete(
                "tasks",
                {
                    tenant: demoTenantId,
                },
                { transaction }
            );

            // 3. Delete tags (depends on projects)
            console.log("- Deleting tags...");
            await queryInterface.bulkDelete(
                "tags",
                {
                    tenant: demoTenantId,
                },
                { transaction }
            );

            // 4. Delete stacks (depends on projects)
            console.log("- Deleting stacks...");
            await queryInterface.bulkDelete(
                "stacks",
                {
                    tenant: demoTenantId,
                },
                { transaction }
            );

            // 5. Delete notepads content (depends on documents)
            console.log("- Deleting notepads content...");
            const [notepadIds] = await queryInterface.sequelize.query(
                `SELECT id FROM "documents" WHERE type = 'notepad' AND tenant = '${demoTenantId}'`,
                { transaction }
            );
            if (notepadIds.length > 0) {
                const notepadIdList = notepadIds.map(n => `'${n.id}'`).join(",");
                await queryInterface.sequelize.query(
                    `DELETE FROM "notepads" WHERE id IN (${notepadIdList})`,
                    { transaction }
                );
            }

            // 6. Delete projects (depends on documents)
            console.log("- Deleting projects...");
            await queryInterface.bulkDelete(
                "projects",
                {
                    tenant: demoTenantId,
                },
                { transaction }
            );

            // 7. Delete permissions (depends on documents/projects/stacks)
            console.log("- Deleting permissions...");
            await queryInterface.bulkDelete(
                "permissions",
                {
                    tenant: demoTenantId,
                },
                { transaction }
            );

            // 8. Delete documents (folders, projects, notepads)
            console.log("- Deleting documents...");
            await queryInterface.bulkDelete(
                "documents",
                {
                    tenant: demoTenantId,
                },
                { transaction }
            );

            // 9. Delete companies
            console.log("- Deleting companies...");
            await queryInterface.bulkDelete(
                "companies",
                {
                    tenant: demoTenantId,
                },
                { transaction }
            );

            // 10. Delete users
            console.log("- Deleting users...");
            await queryInterface.bulkDelete(
                "users",
                {
                    tenant: demoTenantId,
                },
                { transaction }
            );

            // 11. Finally delete the demo tenant
            console.log("- Deleting demo tenant...");
            await queryInterface.bulkDelete(
                "tenants",
                {
                    id: demoTenantId,
                },
                { transaction }
            );

            await transaction.commit();
            console.log("✅ Successfully cleaned up all demo data");
        } catch (error) {
            await transaction.rollback();
            console.error("❌ Error cleaning up demo data:", error);
            throw error;
        }
    },
};

/**
 * Creates helper functions for database operations
 */
function createHelpers(queryInterface, transaction) {
    return {
        /**
         * Checks if an entity exists in the database
         */
        async entityExists(table, id) {
            const [results] = await queryInterface.sequelize.query(
                `SELECT id FROM "${table}" WHERE id = '${id}'`,
                { transaction }
            );
            return results.length > 0;
        },

        /**
         * Inserts permissions for an entity
         */
        async insertPermissions(permissions) {
            if (permissions.length === 0) return;
            await queryInterface.bulkInsert("permissions", permissions, { transaction });
        },

        /**
         * Bulk inserts data into a table
         */
        async bulkInsert(table, data) {
            if (data.length === 0) return;
            await queryInterface.bulkInsert(table, data, { transaction });
        },

        /**
         * Executes a raw SQL query
         */
        async query(sql) {
            return await queryInterface.sequelize.query(sql, { transaction });
        },

        /**
         * Creates standard audit fields
         */
        createAuditFields(userId, tenantId) {
            return {
                tenant: tenantId,
                createdBy: userId,
                updatedBy: userId,
                created: new Date(),
                updated: new Date(),
            };
        },

        /**
         * Creates audit fields for User table (which doesn't have createdBy/updatedBy)
         */
        createUserAuditFields(tenantId) {
            return {
                tenant: tenantId,
                created: new Date(),
                updated: new Date(),
            };
        },

        /**
         * Creates permission object
         */
        createPermission(id, ownerId, tenantId, isPublic = true) {
            return {
                id,
                owner: ownerId,
                tenant: tenantId,
                isPublic,
                ...this.createAuditFields(ownerId, tenantId),
            };
        },
    };
}

/**
 * Creates path configuration
 */
function createPaths(dirname) {
    const demoPath = path.join(dirname, "demo");
    return {
        demo: demoPath,
        people: path.join(demoPath, DEMO_FILES.USERS),
        companies: path.join(demoPath, DEMO_FILES.COMPANIES),
        projects: path.join(demoPath, "projects"),
        notepads: path.join(demoPath, "notepads"),
    };
}

/**
 * User management utilities
 */
function createUserUtils(importedUsers, helpers = null) {
    return {
        getRandomUserId() {
            if (importedUsers.length === 0) return null;
            return importedUsers[Math.floor(Math.random() * importedUsers.length)].id;
        },

        getRandomUserIds() {
            if (importedUsers.length === 0) return [];
            // Generate random number between 1 and 3 (or max available users if less than 3)
            const maxUsers = Math.min(3, importedUsers.length);
            const numUsers = Math.floor(Math.random() * maxUsers) + 1;

            // Shuffle the array and take the first numUsers elements
            const shuffled = [...importedUsers].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, numUsers).map(user => user.id);
        },

        async getRandomTagIds(projectId, count = 3) {
            if (!helpers) return [];

            // Get all non-status tags for this project
            const [tags] = await helpers.query(
                `SELECT id FROM "tags" WHERE ("parent" = '${projectId}' OR "parent" IS NULL) AND "type" != 'status' AND "section" = 'projects'`
            );

            if (tags.length === 0) return [];

            // Generate random number between 1 and count (or max available tags)
            const maxTags = Math.min(count, tags.length);
            const numTags = Math.floor(Math.random() * maxTags) + 1;

            // Shuffle and take random tags
            const shuffled = tags.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, numTags).map(tag => tag.id);
        },

        async getRandomStatusId(projectId) {
            if (!helpers) return null;

            // Get all status tags for this project
            const [statusTags] = await helpers.query(
                `SELECT id FROM "tags" WHERE ("parent" = '${projectId}' OR "parent" IS NULL) AND "type" = 'status' AND "section" = 'projects'`
            );

            if (statusTags.length === 0) return null;

            // Return random status
            return statusTags[Math.floor(Math.random() * statusTags.length)].id;
        },
    };
}

/**
 * File system utilities
 */
const fileUtils = {
    getDirectoriesInPath(dirPath) {
        if (!fs.existsSync(dirPath)) return [];
        return fs.readdirSync(dirPath).filter(item => {
            const fullPath = path.join(dirPath, item);
            return fs.statSync(fullPath).isDirectory();
        });
    },

    getFilesInDirectory(dirPath, extension) {
        if (!fs.existsSync(dirPath)) return [];
        return fs.readdirSync(dirPath).filter(file => file.endsWith(extension));
    },

    readJsonFile(filePath) {
        if (!fs.existsSync(filePath)) return null;
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
    },

    readTextFile(filePath) {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, "utf-8");
    },
};

/**
 * Helper to parse command line arguments
 */
function getArgValue(argName) {
    const argPrefix = `--${argName}=`;
    const arg = process.argv.find(a => a.startsWith(argPrefix));
    if (arg) {
        return arg.split("=")[1];
    }

    const argIndex = process.argv.indexOf(`--${argName}`);
    if (argIndex > -1 && argIndex < process.argv.length - 1) {
        return process.argv[argIndex + 1];
    }

    return null;
}

/**
 * Seeds tenant data
 */
async function seedTenant(helpers, state) {
    const [tenants] = await helpers.query(`SELECT id FROM "tenants" WHERE title = 'Demo'`);

    if (tenants.length) {
        state.tenant = tenants[0];
    } else {
        let tenantId = getArgValue("tenantId");
        if (!tenantId) {
            tenantId = crypto.randomUUID();
            if (getArgValue("tenantId")) {
                console.log(`ℹ️  Using provided Tenant ID: ${tenantId}`);
            }

            await helpers.bulkInsert("tenants", [
                {
                    id: tenantId,
                    title: "Demo",
                    description: "Demo tenant for testing and development",
                    expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                    created: new Date(),
                    updated: new Date(),
                },
            ]);
        }
        state.tenant = { id: tenantId };
    }
}

/**
 * Seeds user data
 */
async function seedUsers(helpers, state, paths) {
    console.log("- Starting users seeding...");

    const users = fileUtils.readJsonFile(paths.people);
    if (!users) {
        console.log("- No users file found, skipping...");
        return;
    }

    const usersToInsert = [];

    for (const user of users) {
        if (await helpers.entityExists("users", user.id)) continue;

        // Map role placeholders to actual UUIDs
        if (user.role && ROLE_MAPPING[user.role]) {
            user.role = ROLE_MAPPING[user.role];
        }

        usersToInsert.push({
            ...user,
            tags: JSON.stringify(user.tags || []),
            hourlyRates: JSON.stringify(user.hourlyRates || {}),
            oauthTokens: JSON.stringify(user.oauthTokens || {}),
            ...helpers.createUserAuditFields(state.tenant.id),
        });
    }

    await helpers.bulkInsert("users", usersToInsert);

    // Load all users for random selection
    const [allUsers] = await helpers.query(`SELECT id FROM "users" WHERE tenant = '${state.tenant.id}'`);
    state.importedUsers = allUsers;

    console.log("- Finished users seeding...");
}

/**
 * Seeds company data
 */
async function seedCompanies(helpers, state, paths) {
    console.log("- Starting companies seeding...");

    const companies = fileUtils.readJsonFile(paths.companies);
    if (!companies) {
        console.log("- No companies file found, skipping...");
        return;
    }

    const userUtils = createUserUtils(state.importedUsers, helpers);
    const companiesToInsert = [];

    for (const company of companies) {
        if (await helpers.entityExists("companies", company.id)) continue;

        const userId = userUtils.getRandomUserId();
        companiesToInsert.push({
            ...company,
            ...helpers.createAuditFields(userId, state.tenant.id),
        });
    }

    await helpers.bulkInsert("companies", companiesToInsert);
    console.log("- Finished companies seeding...");
}

/**
 * Seeds demo folder
 */
async function seedDemoFolder(helpers, state) {
    const demoFolderId = crypto.randomUUID();

    if (await helpers.entityExists("documents", demoFolderId)) return;

    const userUtils = createUserUtils(state.importedUsers, helpers);
    const userId = userUtils.getRandomUserId();

    await helpers.bulkInsert("documents", [
        {
            id: demoFolderId,
            title: "Demo",
            type: "folder",
            order: state.order,
            ...helpers.createAuditFields(userId, state.tenant.id),
        },
    ]);

    state.order++;

    await helpers.insertPermissions([helpers.createPermission(demoFolderId, userId, state.tenant.id)]);

    state.demoFolderId = demoFolderId;
}

/**
 * Seeds project data
 */
async function seedProjects(helpers, state, paths) {
    console.log("- Starting projects seeding...");

    if (!fs.existsSync(paths.projects)) {
        console.log("- No projects directory found, skipping...");
        return;
    }

    const projectFolders = fileUtils.getDirectoriesInPath(paths.projects);
    const userUtils = createUserUtils(state.importedUsers, helpers);

    for (const projectFolder of projectFolders) {
        console.log(`\n🔄 Processing project folder: ${projectFolder}`);
        const projectFolderPath = path.join(paths.projects, projectFolder);

        await processProjectFolder(helpers, state, projectFolderPath, userUtils);
    }

    console.log("- Finished projects seeding...");
}

/**
 * Processes a single project folder
 */
async function processProjectFolder(helpers, state, projectFolderPath, userUtils) {
    const projectFilePath = path.join(projectFolderPath, DEMO_FILES.PROJECT);
    const project = fileUtils.readJsonFile(projectFilePath);

    if (!project) {
        console.log(`- Skipping project folder (no ${DEMO_FILES.PROJECT} found)`);
        return;
    }

    const projectData = Array.isArray(project) ? project[0] : project;
    console.log(`📋 Processing project: ${projectData.title} (${projectData.id})`);

    if (!(await helpers.entityExists("projects", projectData.id))) {
        await createProject(helpers, state, projectData, userUtils);
    } else {
        console.log(`⏭️  Project already exists, skipping creation: ${projectData.title}`);
    }

    // Process project-related data
    await processProjectTasks(helpers, state, projectFolderPath, projectData, userUtils);
}

/**
 * Creates a new project with all related data
 */
async function createProject(helpers, state, projectData, userUtils) {
    console.log(`🆕 Project doesn't exist, creating: ${projectData.title}`);

    const userId = userUtils.getRandomUserId();
    const projectId = projectData.id;
    const { stacks, title, ...cleanProjectData } = projectData;
    const stacksOrder = stacks && stacks.length > 0 ? stacks.map(s => s.id) : [];

    // Map title to description if needed
    if (title) {
        cleanProjectData.description = title;
    }

    // Create document entry
    await helpers.bulkInsert("documents", [
        {
            id: projectId,
            title: projectData.title,
            type: "project",
            parent: state.demoFolderId,
            order: state.order,
            ...helpers.createAuditFields(userId, state.tenant.id),
        },
    ]);

    state.order++;

    // Create project entry
    await helpers.bulkInsert("projects", [
        {
            ...cleanProjectData,
            projectOwner: userId,
            ...helpers.createAuditFields(userId, state.tenant.id),
        },
    ]);

    await helpers.query(
        `UPDATE "projects" SET "stacksOrder" = '${JSON.stringify(
            stacksOrder
        )}'::jsonb WHERE id = '${projectId}'`
    );

    // Create permissions
    await helpers.insertPermissions([helpers.createPermission(projectId, userId, state.tenant.id)]);

    // Create stacks if they exist
    if (stacks && stacks.length > 0) {
        await createProjectStacks(helpers, state, stacks, projectId, userId);
    }
}

/**
 * Creates stacks for a project
 */
async function createProjectStacks(helpers, state, stacks, projectId, userId) {
    const stacksToInsert = [];
    const stacksPermissions = [];

    for (let i = 0; i < stacks.length; i++) {
        const stack = stacks[i];

        if (await helpers.entityExists("stacks", stack.id)) continue;

        stacksToInsert.push({
            id: stack.id,
            title: stack.title,
            project: projectId,
            tint: stack.tint,
            ...helpers.createAuditFields(userId, state.tenant.id),
        });

        stacksPermissions.push(helpers.createPermission(stack.id, userId, state.tenant.id));
    }

    await helpers.bulkInsert("stacks", stacksToInsert);
    await helpers.insertPermissions(stacksPermissions);
}

/**
 * Processes tasks for a project
 */
async function processProjectTasks(helpers, state, projectFolderPath, projectData, userUtils) {
    await processProjectTags(helpers, state, projectFolderPath, userUtils, projectData);

    const tasksPath = path.join(projectFolderPath, DEMO_FILES.TASKS);
    console.log(`\n--- Checking for tasks at: ${tasksPath}`);

    const tasks = fileUtils.readJsonFile(tasksPath);
    if (!tasks || tasks.length === 0) {
        console.log("❌ No tasks found.");
        return;
    }

    const tasksToInsert = [];
    const tasksPermissions = [];
    const stackTaskOrderMap = new Map();

    // ---- Filter out existing tasks (preserve order!) ----
    const availableTasks = [];
    for (const task of tasks) {
        if (!(await helpers.entityExists("tasks", task.id))) {
            availableTasks.push(task);
        }
    }

    if (availableTasks.length === 0) {
        console.log("No new tasks to insert.");
        return;
    }

    // Build tasks order per stack using position (if present) or file order
    for (let idx = 0; idx < availableTasks.length; idx++) {
        const t = availableTasks[idx];
        const list = stackTaskOrderMap.get(t.stack) || [];
        list.push({ id: t.id, position: t.position, index: idx });
        stackTaskOrderMap.set(t.stack, list);
    }

    // ---- Date setup ----
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // ---- Constants ----
    const DAY_START_HOUR = 8;
    const DAY_END_HOUR = 21;
    const MIN_DURATION_MS = 15 * 60 * 1000;
    const MAX_DURATION_MS = 2 * 60 * 60 * 1000;

    const toLocalISOString = date => {
        const pad = n => String(n).padStart(2, "0");
        return (
            date.getFullYear() +
            "-" +
            pad(date.getMonth() + 1) +
            "-" +
            pad(date.getDate()) +
            "T" +
            pad(date.getHours()) +
            ":" +
            pad(date.getMinutes()) +
            ":" +
            pad(date.getSeconds())
        );
    };

    // ==========================================
    // STEP 1: DISTRIBUTE TASKS INTO A DAY MAP
    // ==========================================
    // This ensures every task is assigned to a day before we even think about time.
    const dayMap = Array.from({ length: daysInMonth }, () => []);

    availableTasks.forEach((task, index) => {
        const dayIndex = index % daysInMonth; // Cycles through 0 to 29 (or 30)
        dayMap[dayIndex].push(task);
    });

    // ==========================================
    // STEP 2: ASSIGN TIMES TO TASKS IN THE MAP
    // ==========================================
    for (let dayIdx = 0; dayIdx < dayMap.length; dayIdx++) {
        const dayNumber = dayIdx + 1;
        const tasksToday = dayMap[dayIdx];

        if (tasksToday.length === 0) continue;

        const dayStart = new Date(year, month, dayNumber, DAY_START_HOUR, 0, 0, 0);
        const dayEnd = new Date(year, month, dayNumber, DAY_END_HOUR, 0, 0, 0);

        let currentTime = dayStart.getTime();

        console.log(`📅 Day ${dayNumber}: Scheduling ${tasksToday.length} tasks...`);

        for (let i = 0; i < tasksToday.length; i++) {
            const task = tasksToday[i];

            // Calculate "Slack" (how much free time is left in the day for gaps)
            const tasksRemaining = tasksToday.length - i;
            const timeReservedForMinimums = tasksRemaining * MIN_DURATION_MS;
            const availableSlack = dayEnd.getTime() - currentTime - timeReservedForMinimums;

            // Generate random duration
            let duration = MIN_DURATION_MS + Math.random() * (MAX_DURATION_MS - MIN_DURATION_MS);

            // Generate a random gap before the task to "spread" them out
            // We only add a gap if there is slack available
            const maxGap = availableSlack > 0 ? availableSlack / (tasksRemaining + 1) : 0;
            const gap = Math.round((Math.random() * maxGap) / 60000) * 60000;

            currentTime += gap;

            // Ensure duration doesn't push us past the end of the day
            if (currentTime + duration > dayEnd.getTime()) {
                duration = dayEnd.getTime() - currentTime;
            }

            // Final duration rounding
            duration = Math.max(MIN_DURATION_MS, Math.round(duration / 60000) * 60000);

            const startDate = new Date(currentTime);
            const dueDate = new Date(currentTime + duration);

            const pad = n => String(n).padStart(2, "0");
            console.log(
                `  [${i + 1}/${tasksToday.length}] "${task.title.substring(0, 25)}...": ` +
                    `${pad(startDate.getHours())}:${pad(startDate.getMinutes())} → ` +
                    `${pad(dueDate.getHours())}:${pad(dueDate.getMinutes())}`
            );

            const userId = userUtils.getRandomUserId();
            const randomTagIds = await userUtils.getRandomTagIds(projectData.id, 5);
            const randomStatusId = await userUtils.getRandomStatusId(projectData.id);

            const { position, ...taskData } = task;
            tasksToInsert.push({
                ...taskData,
                startdate: toLocalISOString(startDate),
                duedate: toLocalISOString(dueDate),
                tags: JSON.stringify([...(task.tags || []), ...randomTagIds]),
                status: task.status ?? randomStatusId,
                assignees: JSON.stringify(task.assignees || userUtils.getRandomUserIds()),
                progress: Math.floor(Math.random() * (100 - 0 + 1) + 0),
                ...helpers.createAuditFields(userId, state.tenant.id),
            });

            tasksPermissions.push(helpers.createPermission(task.id, userId, state.tenant.id));

            // Move pointer to the end of the current task
            currentTime += duration;
        }
    }

    // ---- Bulk Insert ----
    if (tasksToInsert.length > 0) {
        await helpers.bulkInsert("tasks", tasksToInsert);
        await helpers.insertPermissions(tasksPermissions);
        console.log(`\n✅ Successfully inserted ${tasksToInsert.length} tasks.`);

        // ---- Update stacks with tasksOrder ----
        for (const [stackId, items] of stackTaskOrderMap.entries()) {
            items.sort((a, b) => {
                const ap = typeof a.position === "number" ? a.position : a.index;
                const bp = typeof b.position === "number" ? b.position : b.index;
                return ap - bp;
            });
            const order = items.map(i => i.id);
            await helpers.query(
                `UPDATE "stacks" SET "tasksOrder" = '${JSON.stringify(order)}'::jsonb WHERE id = '${stackId}'`
            );
        }
    }
}

/**
 * Processes tags for a project
 */
async function processProjectTags(helpers, state, projectFolderPath, userUtils, projectData) {
    const tagsPath = path.join(projectFolderPath, DEMO_FILES.TAGS);
    const tags = fileUtils.readJsonFile(tagsPath);

    if (!tags) return;

    const tagsToInsert = [];

    for (const tag of tags) {
        if (await helpers.entityExists("tags", tag.id)) continue;

        const tagUserId = userUtils.getRandomUserId();
        tagsToInsert.push({
            ...tag,
            ...helpers.createAuditFields(tagUserId, state.tenant.id),
            parent: projectData.id,
        });
    }

    await helpers.bulkInsert("tags", tagsToInsert);
}

/**
 * Processes timelogs for a project
 */
async function processProjectTimelogs(helpers, state, projectFolderPath, projectId, userUtils) {
    const timelogsPath = path.join(projectFolderPath, DEMO_FILES.TIMELOGS);
    const timelogs = fileUtils.readJsonFile(timelogsPath);

    if (!timelogs) return;

    const timelogsToInsert = [];

    for (const timelog of timelogs) {
        const timelogUserId = userUtils.getRandomUserId();
        const timelogData = {
            id: crypto.randomUUID(),
            ...timelog,
            project: projectId,
            person: timelogUserId,
            ...helpers.createAuditFields(timelogUserId, state.tenant.id),
        };

        if (timelogData.status === "approved") {
            timelogData.approvedBy = timelogUserId;
        }

        timelogsToInsert.push(timelogData);
    }

    await helpers.bulkInsert("timelogs", timelogsToInsert);
}

/**
 * Seeds notepad data
 */
async function seedNotepads(helpers, state, paths) {
    console.log("- Starting notepads seeding...");

    if (!fs.existsSync(paths.notepads)) {
        console.log("- No notepads directory found, skipping...");
        return;
    }

    const notepadFiles = fileUtils.getFilesInDirectory(paths.notepads, ".html");
    const userUtils = createUserUtils(state.importedUsers, helpers);

    for (const notepadFile of notepadFiles) {
        await processNotepadFile(helpers, state, paths.notepads, notepadFile, userUtils);
    }

    console.log("- Finished notepads seeding...");
}

/**
 * Processes a single notepad file
 */
async function processNotepadFile(helpers, state, notepadsPath, notepadFile, userUtils) {
    const notepadPath = path.join(notepadsPath, notepadFile);
    const notepadTitle = notepadFile.replace(".html", "").replace(/[-_]/g, " ");

    // Check if notepad already exists by title
    const [existingNotepads] = await helpers.query(
        `SELECT id FROM "documents" WHERE title = '${notepadTitle}' AND type = 'notepad'`
    );

    if (existingNotepads.length > 0) return;

    const notepadId = crypto.randomUUID();
    const notepadUserId = userUtils.getRandomUserId();
    const content = fileUtils.readTextFile(notepadPath);

    if (!content) return;

    // Create document entry
    await helpers.bulkInsert("documents", [
        {
            id: notepadId,
            title: notepadTitle,
            type: "notepad",
            order: state.order,
            parent: state.demoFolderId,
            ...helpers.createAuditFields(notepadUserId, state.tenant.id),
        },
    ]);

    state.order++;

    // Create permissions
    await helpers.insertPermissions([helpers.createPermission(notepadId, notepadUserId, state.tenant.id)]);

    // Create notepad content
    await helpers.bulkInsert("notepads", [
        {
            id: notepadId,
            content,
            ...helpers.createAuditFields(notepadUserId, state.tenant.id),
        },
    ]);
}
