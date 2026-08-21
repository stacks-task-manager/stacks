// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Tags hooks and selectors.
 */
import { RecordsStore } from "app/store/records";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { shallowEqual } from "./store";

/**
 * Returns all tags matching the given section and type, optionally filtered to the provided ids.
 * @param section The section the tags belong to (e.g. projects, people)
 * @param type The type of tags to return (e.g. tag, status)
 * @param filterIds Optional array of tag ids to filter the result by
 * @returns Array of matching ITag objects
 */
export const useTags = (section: TAGSECTION, type: TAGTYPE, filterIds?: string[]): ITag[] => {
    const tags = RecordsStore.use(
        state => state.tags.filter(tag => tag.section === section && tag.type === type),
        shallowEqual
    );

    if (filterIds) {
        return tags.filter(tag => filterIds.includes(tag.id));
    }

    return tags;
};

/**
 * Returns the tag with the given id.
 * @param tagId The id of the tag to find
 * @returns The matching ITag, or undefined if not found
 */
export const useTag = (tagId: string): ITag | undefined => {
    return RecordsStore.use(state => state.tags.find(tag => tag.id === tagId), shallowEqual);
};

/**
 * Non-reactive selector returning all tags matching the given section and type.
 * @param section The section the tags belong to (e.g. projects, people)
 * @param type The type of tags to return (e.g. tag, status)
 * @returns Array of matching ITag objects
 */
export const getTags = (section: TAGSECTION, type: TAGTYPE): ITag[] => {
    return RecordsStore.get().tags.filter(tag => tag.section === section && tag.type === type);
};

/**
 * Non-reactive selector returning the tag with the given id.
 * @param tagId The id of the tag to find
 * @returns The matching ITag, or undefined if not found
 */
export const getTag = (tagId: string): ITag | undefined => {
    return RecordsStore.get().tags.find(tag => tag.id === tagId);
};

/**
 * Returns the tags for a project: project-level tags plus any tags without a parent.
 * @param projectId The id of the project
 * @returns Array of ITag objects for the project
 */
export const useProjectTags = (projectId: string) => {
    const tags = useTags(TAGSECTION.PROJECTS, TAGTYPE.TAG);
    return tags.filter(tag => tag.parent == null || tag.parent === projectId);
};

/**
 * Non-reactive selector returning the tags for a project.
 * @param projectId The id of the project
 * @returns Array of ITag objects for the project
 */
export const getProjectTags = (projectId: string) => {
    const tags = getTags(TAGSECTION.PROJECTS, TAGTYPE.TAG);
    return tags.filter(tag => tag.parent == null || tag.parent === projectId);
};

/**
 * Returns the tags for the people section.
 * @returns Array of ITag objects for people
 */
export const usePeopleTags = () => {
    return useTags(TAGSECTION.PEOPLE, TAGTYPE.TAG);
};

/**
 * Returns the statuses for a project: project-level statuses plus any statuses without a parent.
 * @param projectId The id of the project
 * @returns Array of ITag objects representing project statuses
 */
export const useProjectStatuses = (projectId: string) => {
    const tags = useTags(TAGSECTION.PROJECTS, TAGTYPE.STATUS);
    return tags.filter(tag => tag.parent == null || tag.parent === projectId);
};

/**
 * Non-reactive selector returning the statuses for a project.
 * @param projectId The id of the project
 * @returns Array of ITag objects representing project statuses
 */
export const getProjectStatuses = (projectId: string) => {
    const tags = getTags(TAGSECTION.PROJECTS, TAGTYPE.STATUS);
    return tags.filter(tag => tag.parent == null || tag.parent === projectId);
};

/**
 * Returns the statuses for the people section.
 * @returns Array of ITag objects representing people statuses
 */
export const usePeopleStatuses = () => {
    return useTags(TAGSECTION.PEOPLE, TAGTYPE.STATUS);
};
