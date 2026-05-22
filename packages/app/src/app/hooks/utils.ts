// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Shared hook utilities (equality, selectors).
 */
import { useEffect, RefObject, useState, MutableRefObject, useRef } from "react";

type Event = MouseEvent | TouchEvent;

interface IPos {
    x: number;
    y: number;
}

const DRAG_SPACE = 20;

export const useOnClickOutside = <T extends HTMLElement = HTMLElement>(
    ref: RefObject<T>,
    handler: (event: Event) => void,
    selectors?: string[]
) => {
    const cursorRef = useRef<IPos>({ x: 0, y: 0 });

    useEffect(() => {
        const upListener = (event: Event) => {
            if (
                Math.abs(cursorRef.current.x - (event as MouseEvent).clientX) > DRAG_SPACE ||
                Math.abs(cursorRef.current.y - (event as MouseEvent).clientY) > DRAG_SPACE
            )
                return;

            const el = ref?.current;
            if (selectors && selectors.length && event.target) {
                for (const selector of selectors) {
                    if ((event.target as Element).closest(selector)) return;
                }
            }
            if (!el || el.contains((event?.target as Node) || null)) return;

            handler(event); // Call the handler only if the click is outside of the element passed.
        };

        const downListener = (event: Event) => {
            cursorRef.current = {
                x: (event as MouseEvent).clientX,
                y: (event as MouseEvent).clientY,
            };
        };

        document.addEventListener("mousedown", downListener);
        document.addEventListener("mouseup", upListener);
        // document.addEventListener("touchstart", listener);

        return () => {
            document.removeEventListener("mousedown", downListener);
            document.removeEventListener("mouseup", upListener);
            // document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]); // Reload only if ref or handler changes
};

const OPTIONS = {
    root: null,
    rootMargin: "0px 0px 0px 0px",
    threshold: 0,
};

export const useIsVisible = <T>(elementRef: MutableRefObject<T>) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (elementRef.current) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.unobserve(elementRef.current as unknown as Element);
                    }
                });
            }, OPTIONS);
            observer.observe(elementRef.current as unknown as Element);
        }
    }, [elementRef.current]);

    return isVisible;
};

export const useIntersectionObserver = (
    ref: MutableRefObject<Element | null>,
    options: IntersectionObserverInit = {},
    forward = false
) => {
    const [element, setElement] = useState<Element | null>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);
    const observer = useRef<null | IntersectionObserver>(null);

    const cleanOb = () => {
        if (observer.current) {
            observer.current.disconnect();
        }
    };

    useEffect(() => {
        setElement(ref.current);
    }, [ref]);

    useEffect(() => {
        if (!element) return;
        cleanOb();
        const ob = (observer.current = new IntersectionObserver(
            ([entry]) => {
                const isElementIntersecting = entry.isIntersecting;
                if (!forward) {
                    setIsIntersecting(isElementIntersecting);
                } else if (forward && !isIntersecting && isElementIntersecting) {
                    setIsIntersecting(isElementIntersecting);
                    cleanOb();
                }
            },
            { ...options }
        ));
        ob.observe(element);
        return () => {
            cleanOb();
        };
    }, [element, options]);

    return isIntersecting;
};
