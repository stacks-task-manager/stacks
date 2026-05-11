// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Button, Section, Text } from "@react-email/components";
import Email from "../design/common";
import Styles from "../design/styles";

interface RegistrationTemplateProps {
    appName: string;
}

export const RegistrationEn: React.FC<RegistrationTemplateProps> = ({ appName }) => (
    <Email preview={`Confirm your ${appName} account`}>
        <Section>
            <Text style={Styles.text}>Hi %userName%,</Text>
            <Text style={Styles.text}>
                Thanks for signing up to {appName}. Please confirm your email address to finish
                creating your account.
            </Text>
        </Section>
        <Section style={Styles.centered}>
            <Button style={Styles.button} href="%publicUrl%%verificationLink%">
                Confirm email
            </Button>
        </Section>
        <Section>
            <Text style={Styles.text}>
                This link will expire in %expirationTime%. If you didn't sign up you can ignore
                this message.
            </Text>
        </Section>
    </Email>
);

export default RegistrationEn;
