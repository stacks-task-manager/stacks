"use strict";

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
                    "type" = 'calendar',
                    "updated" = NOW()
                WHERE permissions."deleted" IS NOT NULL
                  AND permissions."id" IN (
                      SELECT "id" FROM "calendars" WHERE "deleted" IS NULL AND "source" = 'local'
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
                    'calendar',
                    source."tenant",
                    source."createdBy",
                    source."updatedBy",
                    NOW(),
                    NOW()
                FROM "calendars" source
                WHERE source."deleted" IS NULL
                  AND source."source" = 'local'
                  AND NOT EXISTS (
                      SELECT 1
                      FROM "permissions" existing
                      WHERE existing."id" = source."id"
                        AND existing."deleted" IS NULL
                  )
                `,
                { transaction }
            );

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
