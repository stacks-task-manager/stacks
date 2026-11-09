"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const columns = await queryInterface.describeTable("users", { transaction });
            for (const [name, definition] of Object.entries({
                activationTokenExpiresAt: { type: Sequelize.DATE, allowNull: true },
                passwordResetTokenHash: { type: Sequelize.STRING, allowNull: true },
                passwordResetTokenExpiresAt: { type: Sequelize.DATE, allowNull: true },
            })) {
                if (!columns[name])
                    await queryInterface.addColumn("users", name, definition, { transaction });
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            let columns = await queryInterface.describeTable("users", { transaction });
            for (const name of [
                "passwordResetTokenExpiresAt",
                "passwordResetTokenHash",
                "activationTokenExpiresAt",
            ]) {
                if (columns[name]) {
                    await queryInterface.removeColumn("users", name, { transaction });
                    columns = await queryInterface.describeTable("users", { transaction });
                }
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
