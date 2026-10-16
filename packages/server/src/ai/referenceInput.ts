// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { z } from "zod";

export const referenceKinds: Record<string, string> = {
    projectId: "project",
    project: "project",
    taskId: "task",
    taskIds: "task",
    parentTaskId: "task",
    afterTaskId: "task",
    stackId: "stack",
    beforeStackId: "stack",
    afterStackId: "stack",
    stack: "stack",
    personId: "person",
    assigneeUserIds: "person",
    projectOwnerId: "person",
    companyId: "company",
    calendarId: "calendar",
    calendar: "calendar",
    eventId: "event",
    notepadId: "notepad",
    statusTagId: "tag",
    statusTagIds: "tag",
    tagIds: "tag",
    recordId: "task",
    resourceIds: "task",
};
export const isUuidReference = (value: string) =>
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);

/** Mentioning a name in user prose never makes it an executable database id. */
export function assertResolvedMutationReferences(input: unknown, knownKinds: Map<string, Set<string>>) {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        if (!/^(.*Id|.*Ids|project|calendar)$/.test(key)) continue;
        for (const id of Array.isArray(value) ? value : [value]) {
            if (typeof id !== "string") continue;
            const kind = referenceKinds[key];
            const providerReference =
                (kind === "calendar" || kind === "event") && knownKinds.get(id)?.has(kind);
            if (!isUuidReference(id) && !providerReference)
                throw new Error(`Resolve ${key} through an authorized lookup; "${id}" is not a resolved id.`);
        }
    }
}

/** Chat accepts names; the original execution schema is still applied after resolution. */
export function referenceNameSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
    const relax = (field: z.ZodTypeAny): z.ZodTypeAny => {
        let result: z.ZodTypeAny = field;
        if (field instanceof z.ZodString) result = z.string().min(1);
        else if (field instanceof z.ZodOptional) result = relax(field.unwrap()).optional();
        else if (field instanceof z.ZodNullable) result = relax(field.unwrap()).nullable();
        else if (field instanceof z.ZodArray)
            result = new z.ZodArray({ ...field._def, type: relax(field.element) });
        else if (field instanceof z.ZodUnion)
            result = z.union(field.options.map(relax) as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
        return result.describe(
            (field.description ?? "Reference") +
                ". Accepts an exact name; the server resolves it through authorized lookups."
        );
    };
    if (schema instanceof z.ZodEffects)
        return new z.ZodEffects({ ...schema._def, schema: referenceNameSchema(schema.innerType()) });
    if (!(schema instanceof z.ZodObject)) return schema;
    const scoped =
        (schema.shape.taskId || schema.shape.stackId) && !schema.shape.projectId
            ? schema.extend({
                  projectId: z
                      .string()
                      .min(1)
                      .optional()
                      .describe("Project ID or exact name to scope the reference lookup"),
              })
            : schema;
    return scoped.extend(
        Object.fromEntries(
            Object.entries(scoped.shape as Record<string, z.ZodTypeAny>)
                .filter(([key]) => referenceKinds[key])
                .map(([key, field]) => [key, relax(field)])
        )
    );
}
