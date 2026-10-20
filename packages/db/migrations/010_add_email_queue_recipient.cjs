"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const columns = await queryInterface.describeTable("email_queue", { transaction });
            if (!columns.recipientEmail)
                await queryInterface.addColumn(
                    "email_queue",
                    "recipientEmail",
                    { type: Sequelize.STRING, allowNull: true },
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
            const columns = await queryInterface.describeTable("email_queue", { transaction });
            if (columns.recipientEmail)
                await queryInterface.removeColumn("email_queue", "recipientEmail", { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
