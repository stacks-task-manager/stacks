import { test as base, Page, BrowserContext } from "@playwright/test";
import users from "../config/users";
import { loginFixture } from "./login";
import { attachVideoContextFixtures } from "./attachVideoContext";

type LoginFixtures = {
    login: (args: { page: Page }) => Promise<void>;
    loginWithUser: (args: { page: Page; user: keyof typeof users }) => Promise<Page>;
    logout: (args: { page: Page }) => Promise<void>;
};

type VideoFixtures = {
    attachVideoContext: (context: BrowserContext) => void;
};

export const test = base.extend<LoginFixtures & VideoFixtures>({
    ...attachVideoContextFixtures,
    ...loginFixture,
} as any);

export { expect } from "@playwright/test";
