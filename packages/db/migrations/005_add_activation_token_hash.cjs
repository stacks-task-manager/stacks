"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const columns = await queryInterface.describeTable("users", { transaction });
            if (!columns.activationTokenHash)
                await queryInterface.addColumn(
                    "users",
                    "activationTokenHash",
                    { type: Sequelize.STRING, allowNull: true },
                    { transaction }
                );

            // Legacy activation links were stored as a raw `token`, which the new lookup
            // (a SHA-256 hash) can never match. Pending links are expired here rather than
            // kept as a raw-token lookup path, so they stop redeeming after rollout. An
            // administrator can resend a fresh activation link; see docs/packages/server.md.
            await queryInterface.sequelize.query(
                `
                UPDATE "users"
                SET "activationTokenExpiresAt" = CURRENT_TIMESTAMP - INTERVAL '1 day'
                WHERE "token" IS NOT NULL
                  AND "activationTokenExpiresAt" > CURRENT_TIMESTAMP
                `,
                { transaction }
            );
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const columns = await queryInterface.describeTable("users", { transaction });
            if (columns.activationTokenHash)
                await queryInterface.removeColumn("users", "activationTokenHash", { transaction });

            // Documented lossy downgrade: `up` moved the expiry of pending legacy links into
            // the past, so the original expiry cannot be restored. Rows keep their raw `token`
            // but no longer have a redeemable link, which is the state `down` reports.
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
