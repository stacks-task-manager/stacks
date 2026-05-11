// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import {
    Body,
    Container,
    Head,
    Html,
    Img,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import Styles from "./styles";

const Logo: React.FC = () => (
    <Img
        src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMTcyOXB4IiBoZWlnaHQ9IjUxMnB4IiB2aWV3Qm94PSIwIDAgMTcyOSA1MTIiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+bG9nbzwvdGl0bGU+CiAgICA8ZyBpZD0iUGFnZS0xIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0ibG9nbyI+CiAgICAgICAgICAgIDxyZWN0IGlkPSJSZWN0YW5nbGUiIGZpbGw9IiMwMDAwMDAiIHg9IjAiIHk9IjAiIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iMTI2Ij48L3JlY3Q+CiAgICAgICAgICAgIDxsaW5lIHgxPSIxNDQiIHkxPSIxMjEiIHgyPSIxNDQiIHkyPSIzMzQuNTc0MTc2IiBpZD0iUGF0aCIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjQwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvbGluZT4KICAgICAgICAgICAgPGxpbmUgeDE9IjI1Ni4zMjk2NyIgeTE9IjEyMSIgeDI9IjI1Ni4zMjk2NyIgeTI9IjIzNi4yODU3MTQiIGlkPSJQYXRoIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iNDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9saW5lPgogICAgICAgICAgICA8bGluZSB4MT0iMzcxLjYxNTM4NSIgeTE9IjEyMSIgeDI9IjM3MS42MTUzODUiIHkyPSIzOTAiIGlkPSJQYXRoIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iNDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9saW5lPgogICAgICAgICAgICA8dGV4dCBpZD0iU3RhY2tzIiBmb250LWZhbWlseT0iSGlyYWdpbm9TYW5zR0ItVzYsIEhpcmFnaW5vIFNhbnMgR0IiIGZvbnQtc2l6ZT0iMjk3IiBmb250LXdlaWdodD0iNTAwIiBmaWxsPSIjMDAwMDAwIj4KICAgICAgICAgICAgICAgIDx0c3BhbiB4PSI2NDMuNTI5NSIgeT0iMzY5Ij5TdGFja3M8L3RzcGFuPgogICAgICAgICAgICA8L3RleHQ+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4="
        height="33"
        alt="Stacks"
    />
);

const Header: React.FC = () => (
    <Section style={Styles.header}>
        <Logo />
    </Section>
);

const Footer: React.FC = () => (
    <Section>
        <Text style={Styles.text}>
            Thanks,
            <br />
            the <strong>Stacks</strong> team!
        </Text>
    </Section>
);

export interface EmailLayoutProps {
    children: React.ReactNode;
    preview?: string;
}

const Email: React.FC<EmailLayoutProps> = ({ children, preview = "A message from Stacks" }) => (
    <Html>
        <Head />
        <Body style={Styles.main}>
            <Preview>{preview}</Preview>
            <Container style={Styles.container}>
                <Header />
                {children}
                <Footer />
            </Container>
        </Body>
    </Html>
);

export default Email;
