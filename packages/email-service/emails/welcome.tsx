// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Link,
    Section,
    Text
} from '@react-email/components';
import React from 'react';
import Email from '../design/common';
import Styles from "../design/styles";

interface WelcomeTemplateProps {
    appName: string;
}

// English Welcome Template
export const WelcomeEn: React.FC<WelcomeTemplateProps> = ({
    appName,
}) => {
    return (
        <Email>
            <Section>
                <Text style={Styles.text}>Hi %firstName%,</Text>
                <Text style={Styles.text}>
                    We're excited to have you join us. To get started,
                    please activate your account by clicking the button below:
                </Text>
            </Section>
            <Section style={Styles.centered}>
                <Button style={Styles.button} href="%publicUrl%%activationLink%">
                    Activate account
                </Button>
            </Section>
            <Section>
                <Text style={Styles.text}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </Text>
                <Text style={Styles.text}>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat {" "}
                    <Link style={Styles.anchor}>
                        culpa qui officia deserunt.
                    </Link>
                </Text>
            </Section>
        </Email>
    );
};

// Default export for backward compatibility
export default WelcomeEn;