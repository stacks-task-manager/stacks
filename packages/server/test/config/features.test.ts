// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, test } from "vitest";
import {
    isPasswordRecoveryEnabled,
    isRegistrationEnabled,
    parseEnabledFeature,
} from "../../src/config/features";

describe("feature flags", () => {
    test.each(["true", "TRUE", "1", "yes", "YeS", "on", " ON "])("enables %s", value => {
        expect(parseEnabledFeature(value)).toBe(true);
    });

    test.each([undefined, "", "false", "FALSE", "0", "no", "off", "anything"])("disables %s", value =>
        expect(parseEnabledFeature(value)).toBe(false)
    );

    test("both features default to disabled", () => {
        expect(isRegistrationEnabled({})).toBe(false);
        expect(isPasswordRecoveryEnabled({})).toBe(false);
    });
});
