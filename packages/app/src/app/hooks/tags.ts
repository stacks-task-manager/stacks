// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Tags hooks and selectors.
 */
import { RecordsStore } from "app/store/records";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { shallowEqual } from "./store";

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

export const useTag = (tagId: string): ITag | undefined => {
    return RecordsStore.use(state => state.tags.find(tag => tag.id === tagId), shallowEqual);
};

export const getTags = (section: TAGSECTION, type: TAGTYPE): ITag[] => {
    return RecordsStore.get().tags.filter(tag => tag.section === section && tag.type === type);
};

export const getTag = (tagId: string): ITag | undefined => {
    return RecordsStore.get().tags.find(tag => tag.id === tagId);
};

export const useProjectTags = (projectId: string) => {
    const tags = useTags(TAGSECTION.PROJECTS, TAGTYPE.TAG);
    return tags.filter(tag => tag.parent == null || tag.parent === projectId);
};

export const getProjectTags = (projectId: string) => {
    const tags = getTags(TAGSECTION.PROJECTS, TAGTYPE.TAG);
    return tags.filter(tag => tag.parent == null || tag.parent === projectId);
};

export const usePeopleTags = () => {
    return useTags(TAGSECTION.PEOPLE, TAGTYPE.TAG);
};

export const getPeopleTags = () => {
    return getTags(TAGSECTION.PEOPLE, TAGTYPE.TAG);
};

export const useProjectStatuses = (projectId: string) => {
    const tags = useTags(TAGSECTION.PROJECTS, TAGTYPE.STATUS);
    return tags.filter(tag => tag.parent == null || tag.parent === projectId);
};

export const getProjectStatuses = (projectId: string) => {
    const tags = getTags(TAGSECTION.PROJECTS, TAGTYPE.STATUS);
    return tags.filter(tag => tag.parent == null || tag.parent === projectId);
};

export const usePeopleStatuses = () => {
    return useTags(TAGSECTION.PEOPLE, TAGTYPE.STATUS);
};

export const getPeopleStatuses = () => {
    return getTags(TAGSECTION.PEOPLE, TAGTYPE.STATUS);
};
