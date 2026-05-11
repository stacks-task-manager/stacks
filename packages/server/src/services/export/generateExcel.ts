// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Builds a one-sheet `.xlsx` workbook in memory from header + row arrays.
 */
import ExcelJS from "exceljs";

/** @returns XLSX file bytes suitable for `Content-Disposition` attachment. */
export async function generateExcel(columns: string[], rows: string[][]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Export");
    if (columns.length > 0) {
        sheet.addRow(columns);
    }
    for (const row of rows) {
        sheet.addRow(row);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
