// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { spawnSync } from "child_process";
import type { ExportEntityType } from "@stacks/types";
import { setTranslations } from "@stacks/translations";
import { getMergedTranslationsForLocale, preloadLocales } from "../src/i18n/locales";
import { generatePdfFromHtml } from "../src/services/export/generatePdfFromHtml";
import { runWithRequestTranslations } from "../src/i18n/requestScope";

type Fixture = { name: string; type: ExportEntityType; locale: string; title: string; data: unknown };

async function main(): Promise<void> {
    preloadLocales();
    setTranslations(getMergedTranslationsForLocale("en"), { locale: "en" });
    const fixturePath = join(__dirname, "fixtures", "export-visual.json");
    const fixtures = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture[];
    const outputDir = resolve(
        process.argv[2] || join(process.cwd(), "..", "..", "output", "pdf", "export-preview")
    );
    mkdirSync(outputDir, { recursive: true });

    for (const fixture of fixtures) {
        for (const filename of readdirSync(outputDir)) {
            if (filename.startsWith(`${fixture.name}-`) && filename.endsWith(".png")) {
                unlinkSync(join(outputDir, filename));
            }
        }
        const translations = getMergedTranslationsForLocale(fixture.locale);
        const pdf = await runWithRequestTranslations(fixture.locale, translations, () =>
            generatePdfFromHtml({
                type: fixture.type,
                locale: fixture.locale,
                title: fixture.title,
                data: fixture.data,
                generatedAt: new Date("2026-08-25T12:00:00Z"),
            })
        );
        const pdfPath = join(outputDir, `${fixture.name}.pdf`);
        writeFileSync(pdfPath, pdf);
        const render = spawnSync("pdftoppm", ["-png", "-r", "120", pdfPath, join(outputDir, fixture.name)], {
            stdio: "inherit",
        });
        if (render.error && (render.error as NodeJS.ErrnoException).code !== "ENOENT") throw render.error;
        if (render.status != null && render.status !== 0)
            throw new Error(`pdftoppm failed for ${fixture.name}`);
        if (render.error) console.warn("pdftoppm was not found; PDFs were generated without PNG previews.");
        console.log(`Generated ${pdfPath}`);
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
