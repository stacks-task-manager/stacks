"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const columns = await queryInterface.describeTable("users", { transaction });
            if (!columns.pendingEmail)
                await queryInterface.addColumn(
                    "users",
                    "pendingEmail",
                    { type: Sequelize.STRING, allowNull: true },
                    { transaction }
                );
            if (!columns.emailChangeTokenHash)
                await queryInterface.addColumn(
                    "users",
                    "emailChangeTokenHash",
                    { type: Sequelize.STRING, allowNull: true },
                    { transaction }
                );
            if (!columns.emailChangeTokenExpiresAt)
                await queryInterface.addColumn(
                    "users",
                    "emailChangeTokenExpiresAt",
                    { type: Sequelize.DATE, allowNull: true },
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
            for (const column of ["emailChangeTokenExpiresAt", "emailChangeTokenHash", "pendingEmail"]) {
                if (columns[column]) await queryInterface.removeColumn("users", column, { transaction });
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
