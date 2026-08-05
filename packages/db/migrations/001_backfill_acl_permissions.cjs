"use strict";

const now = "NOW()";

async function insertMissingPermissions(
    queryInterface,
    transaction,
    { table, type, ownerColumn = '"createdBy"' }
) {
    await queryInterface.sequelize.query(
        `
        INSERT INTO "permissions" (
            "id",
            "owner",
            "isPublic",
            "visibleUsers",
            "visibleRoles",
            "type",
            "tenant",
            "createdBy",
            "updatedBy",
            "created",
            "updated"
        )
        SELECT
            source."id",
            source.${ownerColumn},
            true,
            '[]'::jsonb,
            '[]'::jsonb,
            :type,
            source."tenant",
            source."createdBy",
            source."updatedBy",
            ${now},
            ${now}
        FROM "${table}" source
        WHERE source."deleted" IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM "permissions" existing
              WHERE existing."id" = source."id"
                AND existing."deleted" IS NULL
          )
        `,
        {
            replacements: { type },
            transaction,
        }
    );
}

module.exports = {
    async up(queryInterface) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.sequelize.query(
                `
                UPDATE "permissions" permissions
                SET
                    "deleted" = NULL,
                    "deletedBy" = NULL,
                    "updated" = ${now}
                WHERE permissions."deleted" IS NOT NULL
                  AND permissions."id" IN (
                      SELECT "id" FROM "documents" WHERE "deleted" IS NULL
                      UNION
                      SELECT "id" FROM "projects" WHERE "deleted" IS NULL
                      UNION
                      SELECT "id" FROM "notepads" WHERE "deleted" IS NULL
                      UNION
                      SELECT "id" FROM "tasks" WHERE "deleted" IS NULL
                      UNION
                      SELECT "id" FROM "stacks" WHERE "deleted" IS NULL
                      UNION
                      SELECT "id" FROM "events" WHERE "deleted" IS NULL
                      UNION
                      SELECT "id" FROM "bookmarks" WHERE "deleted" IS NULL
                      UNION
                      SELECT "id" FROM "timelogs" WHERE "deleted" IS NULL
                  )
                `,
                { transaction }
            );

            await queryInterface.sequelize.query(
                `
                INSERT INTO "permissions" (
                    "id",
                    "owner",
                    "isPublic",
                    "visibleUsers",
                    "visibleRoles",
                    "type",
                    "tenant",
                    "createdBy",
                    "updatedBy",
                    "created",
                    "updated"
                )
                SELECT
                    source."id",
                    source."createdBy",
                    true,
                    '[]'::jsonb,
                    '[]'::jsonb,
                    CASE
                        WHEN source."type" = 'project' THEN 'project'
                        WHEN source."type" = 'notepad' THEN 'notepad'
                        ELSE 'document'
                    END,
                    source."tenant",
                    source."createdBy",
                    source."updatedBy",
                    ${now},
                    ${now}
                FROM "documents" source
                WHERE source."deleted" IS NULL
                  AND NOT EXISTS (
                      SELECT 1
                      FROM "permissions" existing
                      WHERE existing."id" = source."id"
                        AND existing."deleted" IS NULL
                  )
                `,
                { transaction }
            );

            await insertMissingPermissions(queryInterface, transaction, {
                table: "projects",
                type: "project",
            });
            await insertMissingPermissions(queryInterface, transaction, {
                table: "notepads",
                type: "notepad",
            });
            await insertMissingPermissions(queryInterface, transaction, { table: "tasks", type: "task" });
            await insertMissingPermissions(queryInterface, transaction, { table: "stacks", type: "stack" });
            await insertMissingPermissions(queryInterface, transaction, { table: "events", type: "event" });
            await insertMissingPermissions(queryInterface, transaction, {
                table: "bookmarks",
                type: "bookmarks",
            });
            await insertMissingPermissions(queryInterface, transaction, {
                table: "timelogs",
                type: "timelog",
                ownerColumn: '"person"',
            });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down() {
        // Intentionally irreversible: these rows may have been edited after backfill.
    },
};
