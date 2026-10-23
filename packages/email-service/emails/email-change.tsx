// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Button, Section, Text } from "@react-email/components";
import Email from "../design/common";
import Styles from "../design/styles";

interface EmailChangeTemplateProps {
    appName: string;
}

export const EmailChangeEn: React.FC<EmailChangeTemplateProps> = ({ appName }) => (
    <Email preview={`Verify your new ${appName} email address`}>
        <Section>
            <Text style={Styles.text}>Hi %userName%,</Text>
            <Text style={Styles.text}>
                Confirm this email address to use it to sign in to your {appName} account.
            </Text>
        </Section>
        <Section style={Styles.centered}>
            <Button style={Styles.button} href="%publicUrl%%verificationLink%">
                Verify email address
            </Button>
        </Section>
        <Section>
            <Text style={Styles.text}>This link expires in %expirationTime%.</Text>
            <Text style={Styles.text}>If you did not request this change, ignore this email.</Text>
        </Section>
    </Email>
);

export default EmailChangeEn;
