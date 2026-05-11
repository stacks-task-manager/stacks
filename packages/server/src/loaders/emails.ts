// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { EmailQueueEntity, UserEntity } from "@stacks/db";
import { EMAIL_TEMPLATES } from "@stacks/types";
import { Transaction } from "sequelize";
import type { User } from "../types";
import { withTransaction } from "./utils";

// Import email service utilities
// Note: These would need to be available as a shared package or API call
// For now, we'll define the interface and implementation can be adjusted
interface EmailQueueData {
    userId: string;
    template: EMAIL_TEMPLATES;
    data?: Record<string, any>;
    scheduledAt?: Date;
    locale?: string;
    tenant: string;
    createdBy: string;
}

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
    extTransaction?: Transaction
) {
    return withTransaction(extTransaction, async () => {
        // Fetch the destination user to get their email
        const destinationUser = await UserEntity.findByPk(destinationUserId);

        if (!destinationUser) {
            return false;
        }

        try {
            await EmailQueueEntity.create({
                userId: destinationUserId,
                template,
                data,
                scheduledAt: scheduleAt || new Date(),
                locale, // Default locale, could be enhanced to use user preference
                tenant: user.tenant,
                createdBy: user.id,
            });

            return true;
        } catch (error) {
            console.error("❌ Error queueing email:", error);
            return false;
        }
    });
}

export const EmailsLoader = {
    queueEmail,
};
