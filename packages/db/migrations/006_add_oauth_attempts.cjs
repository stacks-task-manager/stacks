"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            if (!(await queryInterface.tableExists("oauth_attempts", { transaction })))
                await queryInterface.createTable(
                    "oauth_attempts",
                    {
                        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
                        userId: { type: Sequelize.UUID, allowNull: false },
                        tenant: { type: Sequelize.UUID, allowNull: false },
                        sid: { type: Sequelize.UUID, allowNull: false },
                        stateHash: { type: Sequelize.STRING(64), allowNull: false },
                        nonceHash: { type: Sequelize.STRING(64), allowNull: false },
                        codeVerifier: { type: Sequelize.TEXT, allowNull: false },
                        createdAt: { type: Sequelize.DATE, allowNull: false },
                        expiresAt: { type: Sequelize.DATE, allowNull: false },
                        consumedAt: { type: Sequelize.DATE, allowNull: true },
                    },
                    { transaction }
                );
            await queryInterface.sequelize.query(
                'CREATE UNIQUE INDEX IF NOT EXISTS "oauth_attempts_by_state" ON "oauth_attempts" ("stateHash")',
                { transaction }
            );
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async queryInterface => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            if (await queryInterface.tableExists("oauth_attempts", { transaction })) {
                await queryInterface.dropTable("oauth_attempts", { cascade: true, transaction });
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
