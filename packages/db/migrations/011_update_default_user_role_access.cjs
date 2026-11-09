"use strict";

const legacyAccess = {
    people: { view: true },
    calendar: { view: true, create: true },
    comments: { view: true, create: true },
    timelogs: { view: true, create: true },
};

const currentAccess = {
    people: { read: true },
    calendar: { read: true, write: true },
    comments: { read: true, write: true },
    timelogs: { read: true, write: true },
};

const updateExactDefaultRole = async (queryInterface, from, to, transaction) => {
    await queryInterface.sequelize.query(
        `UPDATE "roles"
         SET "access" = CAST(:nextAccess AS json)
         WHERE "title" = 'User'
           AND "description" = 'User role'
           AND "access"::jsonb = CAST(:previousAccess AS jsonb)`,
        {
            replacements: {
                nextAccess: JSON.stringify(to),
                previousAccess: JSON.stringify(from),
            },
            transaction,
        }
    );
};

module.exports = {
    async up(queryInterface) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await updateExactDefaultRole(queryInterface, legacyAccess, currentAccess, transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await updateExactDefaultRole(queryInterface, currentAccess, legacyAccess, transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
