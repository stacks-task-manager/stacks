// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { EmailQueueEntity, UserEntity } from "@stacks/db";
import { EMAIL_TEMPLATES } from "@stacks/types";
import { Transaction } from "sequelize";
import type { User } from "../types";
import { withTransaction } from "./utils";

/**
 * Queue an email for sending through the email service
 * @param destinationUserId - The user ID to send the email to
 * @param data - Template variables for email compilation
 * @param templateId - The email template name (e.g., 'welcome', 'password-reset', 'notification')
 * @param user - Current user context
 * @param scheduleAt - Optional scheduling date, defaults to immediate sending
 * @param transaction - Optional database transaction
 */
async function queueEmail(
    destinationUserId: string,
    data: Record<string, any>,
    template: EMAIL_TEMPLATES,
    locale: string,
    user: User,
    scheduleAt?: Date,
    extTransaction?: Transaction,
    recipientEmail?: string
) {
    if (
        recipientEmail !== undefined &&
        (template !== EMAIL_TEMPLATES.EMAIL_CHANGE || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail))
    ) {
        return false;
    }

    return withTransaction(extTransaction, async transaction => {
        // Fetch the destination user to get their email
        const destinationUser = await UserEntity.findByPk(destinationUserId, { transaction });

        if (!destinationUser) {
            return false;
        }

        const sender = await UserEntity.findByPk(user.id, {
            attributes: ["id", "tenant", "system"],
            transaction,
        });
        if (!sender) return false;

        const senderTenant = String(sender.get("tenant"));
        const recipientTenant = String(destinationUser.get("tenant"));
        if (senderTenant !== String(user.tenant)) return false;
        if (!sender.get("system") && senderTenant !== recipientTenant) return false;

        try {
            await EmailQueueEntity.create(
                {
                    userId: destinationUserId,
                    recipientEmail: recipientEmail ?? null,
                    template,
                    data,
                    scheduledAt: scheduleAt || new Date(),
                    locale, // Default locale, could be enhanced to use user preference
                },
                { transaction }
            );

            return true;
        } catch {
            console.error("Email queue insert failed");
            return false;
        }
    });
}

export const EmailsLoader = {
    queueEmail,
};
