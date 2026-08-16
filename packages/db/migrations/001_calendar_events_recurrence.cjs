"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async transaction => {
            const calendars = await queryInterface.describeTable("calendars");
            const events = await queryInterface.describeTable("events");

            if (calendars.isDefault && !calendars.primary) {
                await queryInterface.renameColumn("calendars", "isDefault", "primary", { transaction });
            } else if (!calendars.primary) {
                await queryInterface.addColumn(
                    "calendars",
                    "primary",
                    {
                        type: Sequelize.BOOLEAN,
                        allowNull: false,
                        defaultValue: false,
                    },
                    { transaction }
                );
            }

            if (!calendars.source) {
                await queryInterface.addColumn(
                    "calendars",
                    "source",
                    {
                        type: Sequelize.STRING,
                        allowNull: false,
                        defaultValue: "local",
                    },
                    { transaction }
                );
            }

            if (!calendars.readOnly) {
                await queryInterface.addColumn(
                    "calendars",
                    "readOnly",
                    {
                        type: Sequelize.BOOLEAN,
                        allowNull: false,
                        defaultValue: false,
                    },
                    { transaction }
                );
            }

            if (!events.source) {
                await queryInterface.addColumn(
                    "events",
                    "source",
                    {
                        type: Sequelize.STRING,
                        allowNull: false,
                        defaultValue: "local",
                    },
                    { transaction }
                );
            }

            if (!events.calendar) {
                await queryInterface.addColumn(
                    "events",
                    "calendar",
                    {
                        type: Sequelize.STRING,
                        allowNull: false,
                        defaultValue: "local",
                    },
                    { transaction }
                );
            }

            if (!events.location) {
                await queryInterface.addColumn(
                    "events",
                    "location",
                    {
                        type: Sequelize.STRING,
                        allowNull: true,
                    },
                    { transaction }
                );
            }

            if (!events.recurrenceRule) {
                await queryInterface.addColumn(
                    "events",
                    "recurrenceRule",
                    {
                        type: Sequelize.TEXT,
                        allowNull: true,
                    },
                    { transaction }
                );
            }

            if (!events.recurrenceExDates) {
                await queryInterface.addColumn(
                    "events",
                    "recurrenceExDates",
                    {
                        type: Sequelize.JSONB,
                        allowNull: true,
                    },
                    { transaction }
                );
            }
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async transaction => {
            const calendars = await queryInterface.describeTable("calendars");
            const events = await queryInterface.describeTable("events");

            if (events.recurrenceExDates) {
                await queryInterface.removeColumn("events", "recurrenceExDates", { transaction });
            }
            if (events.recurrenceRule) {
                await queryInterface.removeColumn("events", "recurrenceRule", { transaction });
            }
            if (events.location) {
                await queryInterface.removeColumn("events", "location", { transaction });
            }
            if (events.calendar) {
                await queryInterface.removeColumn("events", "calendar", { transaction });
            }
            if (events.source) {
                await queryInterface.removeColumn("events", "source", { transaction });
            }
            if (calendars.readOnly) {
                await queryInterface.removeColumn("calendars", "readOnly", { transaction });
            }
            if (calendars.source) {
                await queryInterface.removeColumn("calendars", "source", { transaction });
            }
        });
    },
};
