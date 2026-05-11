// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Button, Section, Text } from "@react-email/components";
import Email from "../design/common";
import Styles from "../design/styles";

interface PasswordResetTemplateProps {
    appName: string;
}

export const PasswordResetEn: React.FC<PasswordResetTemplateProps> = ({ appName }) => (
    <Email preview={`Reset your ${appName} password`}>
        <Section>
            <Text style={Styles.text}>Hi %userName%,</Text>
            <Text style={Styles.text}>
                We received a request to reset your password for your {appName} account. Click the
                button below to choose a new password.
            </Text>
        </Section>
        <Section style={Styles.centered}>
            <Button style={Styles.button} href="%publicUrl%%resetLink%">
                Reset password
            </Button>
        </Section>
        <Section>
            <Text style={Styles.text}>
                This link will expire in %expirationTime% for security reasons.
            </Text>
            <Text style={Styles.text}>
                If you didn't request a password reset you can safely ignore this email; your
                password will remain unchanged.
            </Text>
        </Section>
    </Email>
);

export default PasswordResetEn;
