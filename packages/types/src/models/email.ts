// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum EMAIL_TEMPLATES {
    WELCOME = "welcome",
    PASSWORD_RESET = "password-reset",
    REGISTRATION = "registration",
    NOTIFICATION = "notification",
}

// Base interface for all email templates
export interface BaseEmailTemplate {
    recipientId: string;
    scheduleAt?: Date;
}

// Welcome email interface
export interface WelcomeEmailTemplate extends BaseEmailTemplate {
    template: EMAIL_TEMPLATES.WELCOME;
    data: {
        firstName: string;
        lastName?: string;
        activationLink: string;
    };
}

// Password reset email interface
export interface PasswordResetEmailTemplate extends BaseEmailTemplate {
    template: EMAIL_TEMPLATES.PASSWORD_RESET;
    data: {
        userName: string;
        resetLink: string;
        expirationTime: string;
        ipAddress?: string;
        userAgent?: string;
    };
}

// Registration email interface
export interface RegistrationEmailTemplate extends BaseEmailTemplate {
    template: EMAIL_TEMPLATES.REGISTRATION;
    data: {
        userName: string;
        verificationLink: string;
        companyName?: string;
        expirationTime?: string;
    };
}

// Notification email interface
export interface NotificationEmailTemplate extends BaseEmailTemplate {
    template: EMAIL_TEMPLATES.NOTIFICATION;
    data: {
        title: string;
        message: string;
        actionUrl?: string;
        actionText?: string;
        priority?: 'low' | 'medium' | 'high';
        category?: string;
    };
}

// Union type for all email templates
export type EmailTemplate =
    | WelcomeEmailTemplate
    | PasswordResetEmailTemplate
    | RegistrationEmailTemplate
    | NotificationEmailTemplate;

// Type mapping for template data based on template type
export type EmailTemplateData<T extends EMAIL_TEMPLATES> =
    T extends EMAIL_TEMPLATES.WELCOME ? WelcomeEmailTemplate['data'] :
    T extends EMAIL_TEMPLATES.PASSWORD_RESET ? PasswordResetEmailTemplate['data'] :
    T extends EMAIL_TEMPLATES.REGISTRATION ? RegistrationEmailTemplate['data'] :
    T extends EMAIL_TEMPLATES.NOTIFICATION ? NotificationEmailTemplate['data'] :
    never;

// Type-safe sendEmail function signature
export interface SendEmailFunction {
    <T extends EMAIL_TEMPLATES>(
        recipientId: string,
        template: T,
        data: EmailTemplateData<T>,
        scheduleAt?: Date
    ): Promise<boolean>;
}
