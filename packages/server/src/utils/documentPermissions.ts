// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DocumentEntity } from "@stacks/db";
import { translate } from "@stacks/translations";
import type { Transaction } from "sequelize";
import { Errors } from "../errors";
import { findAll, findOne } from "../loaders/utils";

const ROOT_DOCUMENT_ID = "00000000-0000-0000-0000-000000000000";

export async function assertDocumentHierarchyVisible(id: string, transaction?: Transaction) {
    const visited = new Set<string>();
    let current: string | null = id;
    while (current && current !== ROOT_DOCUMENT_ID) {
        if (visited.has(current)) throw Errors.notFound(translate("Document not found"));
        visited.add(current);
        const document = await findOne({ entity: DocumentEntity, id: current, transaction });
        if (!document) throw Errors.notFound(translate("Document not found"));
        current = document.parent;
    }
}

export async function getHierarchyVisibleDocumentIds(transaction?: Transaction): Promise<string[]> {
    const documents: any[] = await findAll({ entity: DocumentEntity, transaction });
    const byId = new Map(documents.map(document => [document.id, document]));
    return documents
        .filter(document => {
            const visited = new Set([document.id]);
            let parent = document.parent;
            while (parent && parent !== ROOT_DOCUMENT_ID) {
                if (visited.has(parent) || !byId.has(parent)) return false;
                visited.add(parent);
                parent = byId.get(parent)?.parent;
            }
            return true;
        })
        .map(document => document.id);
}
