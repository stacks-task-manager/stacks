// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Button, Section, Text } from "@react-email/components";
import Email from "../design/common";
import Styles from "../design/styles";

interface NotificationTemplateProps {
    appName: string;
}

export const NotificationEn: React.FC<NotificationTemplateProps> = ({ appName }) => (
    <Email preview={`%title% - ${appName}`}>
        <Section>
            <Text style={{ ...Styles.text, fontWeight: 600 }}>%title%</Text>
            <Text style={Styles.text}>%message%</Text>
        </Section>
        <Section style={Styles.centered}>
            <Button style={Styles.button} href="%publicUrl%%actionUrl%">
                %actionText%
            </Button>
        </Section>
    </Email>
);

export default NotificationEn;
