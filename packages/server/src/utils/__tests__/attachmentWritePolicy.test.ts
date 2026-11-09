import { describe, expect, it } from "vitest";
import { FILES_TYPE } from "@stacks/types";
import { canWriteAttachmentParent } from "../attachmentWritePolicy";

const defaults = {
    admin: false,
    userId: "user-a",
    ownerId: "user-a",
    canWriteComments: false,
    canWriteCompanies: false,
    canWriteProjectSettings: false,
};

describe("attachment parent write policy", () => {
    it.each([
        FILES_TYPE.TASK_ATTACHMENT,
        FILES_TYPE.TASK_COVER,
        FILES_TYPE.NOTEPAD_COVER,
        FILES_TYPE.NOTEPAD_FILE,
        FILES_TYPE.FILE,
    ])("requires ACL ownership for %s", type => {
        expect(canWriteAttachmentParent({ ...defaults, type })).toBe(true);
        expect(canWriteAttachmentParent({ ...defaults, ownerId: "user-b", type })).toBe(false);
        expect(canWriteAttachmentParent({ ...defaults, admin: true, type })).toBe(true);
    });

    it("applies comments RBAC to task comment attachments", () => {
        expect(canWriteAttachmentParent({ ...defaults, type: FILES_TYPE.TASK_COMMENT })).toBe(false);
        expect(
            canWriteAttachmentParent({ ...defaults, canWriteComments: true, type: FILES_TYPE.TASK_COMMENT })
        ).toBe(true);
    });

    it("allows project owner or project settings writers", () => {
        expect(
            canWriteAttachmentParent({
                ...defaults,
                ownerId: undefined,
                projectOwnerId: "user-a",
                type: FILES_TYPE.PROJECT_DESCRIPTION,
            })
        ).toBe(true);
        expect(
            canWriteAttachmentParent({
                ...defaults,
                ownerId: undefined,
                projectOwnerId: "user-b",
                canWriteProjectSettings: true,
                type: FILES_TYPE.PROJECT_DESCRIPTION,
            })
        ).toBe(true);
    });

    it("allows avatar writes only for the matching account", () => {
        expect(canWriteAttachmentParent({ ...defaults, type: FILES_TYPE.AVATAR })).toBe(true);
        expect(canWriteAttachmentParent({ ...defaults, ownerId: "user-b", type: FILES_TYPE.AVATAR })).toBe(
            false
        );
    });

    it("requires company write access for company logos", () => {
        expect(
            canWriteAttachmentParent({
                ...defaults,
                ownerId: "user-b",
                canWriteCompanies: true,
                type: FILES_TYPE.COMPANY_LOGO,
            })
        ).toBe(true);
        expect(
            canWriteAttachmentParent({
                ...defaults,
                ownerId: "user-a",
                type: FILES_TYPE.COMPANY_LOGO,
            })
        ).toBe(false);
        expect(canWriteAttachmentParent({ ...defaults, admin: true, type: FILES_TYPE.COMPANY_LOGO })).toBe(
            true
        );
    });
});
