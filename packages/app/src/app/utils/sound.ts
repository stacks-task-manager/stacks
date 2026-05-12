// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-var-requires */
import { PreferencesStore } from "app/store/preferences";

const complete = require("assets/sounds/complete.mp3");
const uncomplete = require("assets/sounds/uncomplete.mp3");
const alert = require("assets/sounds/alert.mp3");
const sad = require("assets/sounds/sad.mp3");

const sounds = {
    complete: new Audio(complete),
    uncomplete: new Audio(uncomplete),
    alert: new Audio(alert),
    sad: new Audio(sad),
};

export default {
    play(soundName: keyof typeof sounds) {
        return new Promise<void>(resolve => {
            const preferences = PreferencesStore.get();
            if (!preferences.sounds) return;
            if (Object.keys(sounds).includes(soundName)) {
                sounds[soundName].pause();
                sounds[soundName].currentTime = 0;
                sounds[soundName].play();
            }

            sounds[soundName].onended = () => resolve();
        });
    },
};
