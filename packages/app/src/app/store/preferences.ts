// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Client-side preferences mirror of boot payload.
 */
import { defaultPreferences, IPreferences } from "@stacks/types";

import { entity } from "app/hooks/store";

export const PreferencesStore = entity<IPreferences>({ ...defaultPreferences });
