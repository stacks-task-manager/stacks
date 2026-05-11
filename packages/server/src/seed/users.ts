// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { RoleEntity, sequelize, TenantEntity, UserEntity } from "@stacks/db";
import { EMAIL_TEMPLATES, ROLE_SECTIONS } from "@stacks/types";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getLicense } from "@stacks/license";
import { EmailsLoader } from "../loaders";

/**
 * Seeds the database with a default tenant and admin user if they don't exist
 */
export const seedUsers = async () => {
    const license = getLicense();

    /**
     * System user
     */
    const systemUsers = await UserEntity.findAll({
        where: {
            system: true,
        },
    });

    let systemUser = null;
    if (systemUsers.length === 0) {
        console.log("➡️ Seeding system user");
        const systemUserId = randomUUID();
        const systemTenant = randomUUID();

        const systemRole = await RoleEntity.create({
            title: "System",
            description: "System role",
            disabled: false,
            tenant: systemTenant,
            createdBy: systemUserId,
            updatedBy: systemUserId,
        });

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomUUID(), salt);

        const systemUserEntity = await UserEntity.create({
            id: systemUserId,
            email: "system@getstacksapp.com",
            password: hashedPassword,
            firstName: "System",
            lastName: "User",
            admin: false,
            system: true,
            tenant: systemTenant,
            role: systemRole.get("id"),
        });
        systemUser = systemUserEntity.toJSON();
    } else {
        if (systemUsers.length > 1) {
            console.log("❌ Multiple system users found, skipping seeding");
            // quite the process
            process.exit(1);
        }

        systemUser = systemUsers[0].toJSON();
    }

    try {
        /**
         * ------------------
         * TENANTS GENERATION
         * ------------------
         */
        for (const tenant of license.tenants) {
            // Check if tenant exists
            const [tenantResults] = await sequelize.query(`SELECT * FROM tenants WHERE id = '${tenant.id}'`);

            if (tenantResults.length === 0) {
                console.log(`➡️ Seeding license tenant: ${tenant.name}`);

                await TenantEntity.create({
                    id: tenant.id,
                    title: tenant.name,
                    description: tenant.name,
                    expiry: tenant.expiry,
                    disabled: false,
                    createdBy: systemUser.id,
                    updatedBy: systemUser.id,
                });
            }

            /**
             * ----------------
             * ROLES GENERATION
             * ----------------
             */
            // Check if default role exists
            const [roleResults] = await sequelize.query(`SELECT * FROM roles WHERE tenant = '${tenant.id}'`);

            if (roleResults.length === 0) {
                console.log("➡️ Seeding default role...");

                const roles = [
                    {
                        title: "Manager",
                        description: "Manager role",
                        access: {
                            [ROLE_SECTIONS.PEOPLE]: {
                                write: true,
                                read: true,
                            },
                            [ROLE_SECTIONS.REPORTS]: {
                                read: true,
                            },
                            [ROLE_SECTIONS.COMPANIES]: {
                                read: true,
                            },
                            [ROLE_SECTIONS.CALENDAR]: {
                                read: true,
                                write: true,
                            },
                            [ROLE_SECTIONS.COMMENTS]: {
                                read: true,
                                write: true,
                            },
                            [ROLE_SECTIONS.PROJECT_SETTINGS]: {
                                read: true,
                            },
                            [ROLE_SECTIONS.TIMELOGS]: {
                                read: true,
                                write: true,
                            },
                        },
                    },
                    {
                        title: "Collaborator",
                        description: "Collaborator role",
                        access: {
                            [ROLE_SECTIONS.COMMENTS]: {
                                read: true,
                                write: true,
                            },
                        },
                    },
                    {
                        title: "Contact",
                        description: "Contact role",
                    },
                    {
                        title: "Client",
                        description: "Client role",
                    },
                ];

                for (const role of roles) {
                    await RoleEntity.create({
                        title: role.title,
                        description: role.description,
                        access: role.access,
                        disabled: false,
                        tenant: tenant.id,
                        createdBy: systemUser.id,
                        updatedBy: systemUser.id,
                    });
                }

                await RoleEntity.create({
                    title: "User",
                    description: "User role",
                    access: {
                        [ROLE_SECTIONS.PEOPLE]: {
                            view: true,
                        },
                        [ROLE_SECTIONS.CALENDAR]: {
                            view: true,
                            create: true,
                        },
                        [ROLE_SECTIONS.COMMENTS]: {
                            view: true,
                            create: true,
                        },
                        [ROLE_SECTIONS.TIMELOGS]: {
                            view: true,
                            create: true,
                        },
                    },
                    disabled: false,
                    tenant: tenant.id,
                    createdBy: systemUser.id,
                    updatedBy: systemUser.id,
                });
            }

            const userRole = await RoleEntity.findOne({
                where: {
                    title: "User",
                    tenant: tenant.id,
                },
            });

            if (!userRole) {
                continue;
            }

            /**
             * ----------------
             * ADMINS GENERATION
             * ----------------
             */
            for (const admin of tenant.admins) {
                const foundAdminUser = await UserEntity.findOne({
                    where: {
                        email: admin.email,
                        tenant: tenant.id,
                    },
                });

                if (foundAdminUser) continue;

                console.log(`➡️ Seeding license admin user: ${admin.email}`);

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(admin.password ?? randomUUID(), salt);

                const adminUser = await UserEntity.create({
                    email: admin.email,
                    password: hashedPassword,
                    firstName: admin.firstName ?? "Admin",
                    lastName: admin.lastName ?? "Admin",
                    admin: true,
                    real: true,
                    token: admin.password ? null : randomUUID(),
                    tenant: tenant.id,
                    role: userRole.get("id"),
                });
                const adminUserData = adminUser.toJSON();

                await EmailsLoader.queueEmail(
                    adminUserData.id,
                    {
                        firstName: adminUserData.firstName,
                        lastName: adminUserData.lastName,
                        activationLink: `/auth/activate/${adminUserData.token}`,
                    },
                    EMAIL_TEMPLATES.WELCOME,
                    "en",
                    systemUser
                );
            }

            // checking if tenant has the allowed admin users
            const tenantAdminUsers = await UserEntity.findAll({
                where: {
                    tenant: tenant.id,
                    admin: true,
                },
            });
            if (tenantAdminUsers.length > tenant.admins.length) {
                console.log(
                    `❌ Tenant ${tenant.name} has more admin users than allowed. Disabling all admins and tenant`
                );

                for (const adminUser of tenantAdminUsers) {
                    await adminUser.update(
                        {
                            disabled: true,
                            updatedBy: systemUser.id,
                        },
                        {
                            returning: false,
                        }
                    );
                }

                await TenantEntity.update(
                    {
                        disabled: true,
                    },
                    {
                        where: {
                            id: tenant.id,
                        },
                        returning: false,
                    }
                );
            }
        }

        console.log("✅ User seeding completed");
    } catch (error) {
        console.error("❌ Error seeding users:", error);
        throw error;
    }
};
