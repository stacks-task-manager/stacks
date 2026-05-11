// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";

/**
 * User-visible API error strings used as **keys** in `locales/server/{locale}.json`.
 */
export const ApiMessageKeys = {
    validationFailed: translate("Validation failed"),
    databaseOperationFailed: translate("Database operation failed"),
    internalServerError: translate("Internal server error"),
    unknownErrorOccurred: translate("Unknown error occurred"),
} as const;
