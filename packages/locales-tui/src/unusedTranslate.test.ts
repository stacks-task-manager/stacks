// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it } from "vitest";
import { collectTranslateStaticKeys } from "./unusedTranslate.js";

const tmp = join(dirname(fileURLToPath(import.meta.url)), "__tmp_ast__");

afterEach(() => {
    try {
        rmSync(tmp, { recursive: true });
    } catch {
        /* ignore */
    }
});

describe("collectTranslateStaticKeys", () => {
    it("extracts literals including ternary branches", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(
            join(tmp, "sample.tsx"),
            `
import { translate } from "@stacks/translations";
const a = translate("one");
const b = translate(
  "two"
);
const c = translate(x ? "three" : "four");
const d = translate(missing);
`,
            "utf8",
        );

        const { staticKeys, dynamicSites } = collectTranslateStaticKeys([tmp]);
        expect(staticKeys.has("one")).toBe(true);
        expect(staticKeys.has("two")).toBe(true);
        expect(staticKeys.has("three")).toBe(true);
        expect(staticKeys.has("four")).toBe(true);
        expect(dynamicSites.length).toBeGreaterThanOrEqual(1);
    });
});
