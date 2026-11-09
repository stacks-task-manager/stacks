"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            if (!(await queryInterface.tableExists("auth_sessions", { transaction })))
                await queryInterface.createTable(
                    "auth_sessions",
                    {
                        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
                        userId: { type: Sequelize.UUID, allowNull: false },
                        tenant: { type: Sequelize.UUID, allowNull: false },
                        createdAt: { type: Sequelize.DATE, allowNull: false },
                        expiresAt: { type: Sequelize.DATE, allowNull: false },
                        revokedAt: { type: Sequelize.DATE, allowNull: true },
                    },
                    { transaction }
                );
            await queryInterface.sequelize.query(
                'CREATE INDEX IF NOT EXISTS "auth_sessions_by_user" ON "auth_sessions" ("userId")',
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
            if (await queryInterface.tableExists("auth_sessions", { transaction })) {
                await queryInterface.dropTable("auth_sessions", { cascade: true, transaction });
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
