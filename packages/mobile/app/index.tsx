// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Redirect } from "expo-router";

import { useAuth } from "../src/state/AuthContext";

export default function Index() {
    const { serverUrl, token } = useAuth();

    if (!serverUrl || !token) {
        return <Redirect href="/(auth)/login" />;
    }

    return <Redirect href="/(app)" />;
}
