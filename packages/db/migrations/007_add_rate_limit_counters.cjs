"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            if (!(await queryInterface.tableExists("rate_limit_counters", { transaction })))
                await queryInterface.createTable(
                    "rate_limit_counters",
                    {
                        keyHash: { type: Sequelize.STRING(64), allowNull: false, primaryKey: true },
                        windowStart: { type: Sequelize.BIGINT, allowNull: false, primaryKey: true },
                        hits: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
                        expiresAt: { type: Sequelize.DATE, allowNull: false },
                    },
                    { transaction }
                );
            await queryInterface.sequelize.query(
                'CREATE INDEX IF NOT EXISTS "rate_limit_counters_expiry" ON "rate_limit_counters" ("expiresAt")',
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
            if (await queryInterface.tableExists("rate_limit_counters", { transaction })) {
                await queryInterface.dropTable("rate_limit_counters", { transaction });
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
