// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Workspace tags with duplicate title guard per tenant.
 */
import { TagEntity } from "@stacks/db";
import { Errors } from "../errors";
import { ITag, UUID } from "@stacks/types";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { sanitizeWhere } from "./utils";
import { translate } from "@stacks/translations";

export const TagsLoader = {
    /** Lists all tags for the tenant alphabetically. */
    async getAll() {
        const tags = await TagEntity.findAll({
            where: sanitizeWhere(),
            order: [["title", "ASC"]],
        });
        return tags.map(tag => tag.toJSON());
    },
    /** Creates a tag; rejects duplicate titles in the tenant. */
    async create(data: ITag) {
        const user = getCurrentUser();

        const existingTag = await TagEntity.findOne({
            where: {
                title: data.title,
                tenant: user.tenant,
            },
        });
        if (existingTag) {
            throw Errors.alreadyExists(translate("Tag already exists"));
        }

        try {
            const newTag = await TagEntity.create({
                ...data,
                tenant: user.tenant,
                createdBy: user.id,
                updatedBy: user.id,
            });
            invalidateApiCacheForCurrentRequest();
            return newTag.toJSON();
        } catch (error) {
            throw error;
        }
    },
    /** Updates fields on an existing tenant tag. */
    async update(id: UUID, data: Partial<ITag>) {
        const user = getCurrentUser();
        try {
            const tag = await TagEntity.findOne({
                where: {
                    id,
                    tenant: user.tenant,
                },
            });
            if (!tag) {
                throw Errors.notFound(translate("Tag not found"));
            }

            await tag.update(
                {
                    ...data,
                    updatedBy: user.id,
                    updatedOn: new Date(),
                },
                {
                    returning: false,
                }
            );

            invalidateApiCacheForCurrentRequest();
            return true;
        } catch (error) {
            throw error;
        }
    },
};
