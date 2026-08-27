"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn(
                "users",
                "activationTokenExpiresAt",
                { type: Sequelize.DATE, allowNull: true },
                { transaction }
            );
            await queryInterface.addColumn(
                "users",
                "passwordResetTokenHash",
                { type: Sequelize.STRING, allowNull: true },
                { transaction }
            );
            await queryInterface.addColumn(
                "users",
                "passwordResetTokenExpiresAt",
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
            await queryInterface.removeColumn("users", "passwordResetTokenExpiresAt", { transaction });
            await queryInterface.removeColumn("users", "passwordResetTokenHash", { transaction });
            await queryInterface.removeColumn("users", "activationTokenExpiresAt", { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
