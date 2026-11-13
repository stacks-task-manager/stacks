"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.createTable(
                "workbooks",
                {
                    id: {
                        type: Sequelize.UUID,
                        defaultValue: Sequelize.UUIDV4,
                        primaryKey: true,
                        allowNull: false,
                    },
                    title: { type: Sequelize.STRING, allowNull: false },
                    filters: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
                    tenant: { type: Sequelize.UUID, allowNull: false },
                    createdBy: { type: Sequelize.UUID, allowNull: false },
                    updatedBy: { type: Sequelize.UUID, allowNull: false },
                    deletedBy: { type: Sequelize.UUID, allowNull: true },
                    created: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
                    updated: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
                    deleted: { type: Sequelize.DATE, allowNull: true },
                },
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
            await queryInterface.bulkUpdate(
                "permissions",
                { deleted: new Date() },
                { type: "workbook", deleted: null },
                { transaction }
            );
            await queryInterface.dropTable("workbooks", { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
