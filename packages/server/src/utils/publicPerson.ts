// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Public person serializer.
 *
 * A user row carries credential columns (`password`, `token`, reset/OAuth state) and internal
 * bookkeeping. Only the fields explicitly declared public below cross this boundary.
 */
import { IPerson } from "@stacks/types";

const PUBLIC_PERSON_FIELDS = [
    "id",
    "tenant",
    "created",
    "updated",
    "avatar",
    "firstName",
    "lastName",
    "email",
    "gender",
    "nickname",
    "birthday",
    "age",
    "title",
    "jobTitle",
    "company",
    "officePhone",
    "cellPhone",
    "homePhone",
    "fax",
    "address",
    "county",
    "zip",
    "city",
    "country",
    "address2",
    "website",
    "notes",
    "socialTwitter",
    "socialFacebook",
    "socialLinkedin",
    "socialInstagram",
    "socialOther",
    "personalId",
    "userId",
    "tags",
    "role",
    "real",
    "admin",
    "disabled",
    "onlineStatus",
    "hourlyRates",
    "lastOnline",
] as const;

/** Copies only approved fields out of a raw user row. */
export function toPublicPerson(row: Record<string, unknown>): IPerson {
    const person: Record<string, unknown> = {};
    for (const field of PUBLIC_PERSON_FIELDS) {
        if (Object.hasOwn(row, field)) person[field] = row[field];
    }
    return person as unknown as IPerson;
}
