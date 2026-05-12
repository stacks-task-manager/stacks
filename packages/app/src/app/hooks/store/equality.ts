// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Checks if two values are referentially equal.
 *
 * @param a - first value to compare
 * @param b - second value to compare
 * @returns true/false
 */
export function strictEqual(a: any, b: any) {
    return a === b;
}

export function jsonCompare(a: any, b: any) {
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Checks if two objects have equal properties, regardless of whether the
 * objects themselves are referentially equal.
 *
 * @param a - first object to compare
 * @param b - second object to compare
 * @returns true/false
 */
export function shallowEqual(a: any, b: any) {
    return strictEqual(a, b) || (bothObjects(a, b) && equalProps(a, b));
}

export function deepEqual(obj1: any, obj2: any) {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 == null || obj2 == null) return false;
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false;
    }
    return true;
}

function bothObjects(a: any, b: any) {
    return typeof a === "object" && a !== null && typeof b === "object" && b !== null;
}

function equalProps(a: any, b: any) {
    const keysOfA = Object.keys(a);
    const keysOfB = Object.keys(b);

    if (keysOfA.length !== keysOfB.length) return false;

    for (let i = 0; i < keysOfA.length; i++) {
        const key = keysOfA[i];
        if (!b.hasOwnProperty(key) || a[key] !== b[key]) return false;
    }

    return true;
}
