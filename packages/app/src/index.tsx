// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Position, OverlayToaster, Spinner } from "@blueprintjs/core";
import "app/utils/prototypes";
import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import "./index.scss";
import { setTranslations } from "@stacks/translations";
import { UpdatePoller } from "app/utils/polling";
import { PreferencesActions } from "app/store/actions/preferences";
import { BootAPI } from "app/api";
import { AiChatActions } from "app/store/actions/aiChat";
import { CalendarActions } from "app/store/actions/calendar";
import { LicenseActions, ProjectFiltersActions } from "app/store/actions";
import { getBrowserLocale } from "app/utils/browser";

const App = React.lazy(() => import("./app/App"));

function AppLoading() {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <Spinner />
        </div>
    );
}

const initToast = async () => {
    window.toaster = await OverlayToaster.create({
        position: Position.BOTTOM_RIGHT,
    });
};

initToast();

window.updatePoller = new UpdatePoller();
window.addEventListener("beforeunload", () => {
    if (window.updatePoller) {
        window.updatePoller.disconnect();
    }
});

void (async () => {
    const { translations, license, preferences, aiChat, integrations } = await BootAPI.load();
    setTranslations(translations, { locale: getBrowserLocale() });
    LicenseActions.setLicense(license);
    PreferencesActions.set(preferences);
    ProjectFiltersActions.loadSaved();
    AiChatActions.setServerEnabled(Boolean(aiChat?.enabled));
    await CalendarActions.hydrateFromBoot(integrations);

    if (preferences.forceWeekMonday) {
        // moment.updateLocale(savedDateLocale, { week: { dow: 1 } });
    }

    const container = document.getElementById("root");
    const root = createRoot(container!);

    root.render(
        <Suspense fallback={<AppLoading />}>
            <HashRouter>
                <App />
            </HashRouter>
        </Suspense>
    );
})();
