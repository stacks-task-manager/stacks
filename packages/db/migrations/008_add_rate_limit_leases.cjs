"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            if (!(await queryInterface.tableExists("rate_limit_leases", { transaction })))
                await queryInterface.createTable(
                    "rate_limit_leases",
                    {
                        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
                        keyHash: { type: Sequelize.STRING(64), allowNull: false },
                        expiresAt: { type: Sequelize.DATE, allowNull: false },
                    },
                    { transaction }
                );
            await queryInterface.sequelize.query(
                'CREATE INDEX IF NOT EXISTS "rate_limit_leases_key_expiry" ON "rate_limit_leases" ("keyHash", "expiresAt")',
                { transaction }
            );
            await queryInterface.sequelize.query(
                'CREATE INDEX IF NOT EXISTS "rate_limit_leases_expiry" ON "rate_limit_leases" ("expiresAt")',
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
            if (await queryInterface.tableExists("rate_limit_leases", { transaction })) {
                await queryInterface.dropTable("rate_limit_leases", { transaction });
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
