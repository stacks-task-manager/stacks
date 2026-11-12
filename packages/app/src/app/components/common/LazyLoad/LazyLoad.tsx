// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HTMLDivProps } from "@blueprintjs/core";
import React, {
    ForwardRefRenderFunction,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";

interface Props extends HTMLDivProps {
    disabled?: boolean;
    /**
     * Whether the element should be visible initially or not.
     * Useful e.g. for always setting the first N items to visible.
     * Default: false
     */
    initialVisible?: boolean;
    /** An estimate of the element's height */
    defaultHeight?: number;
    /** How far outside the viewport in pixels should elements be considered visible?  */
    visibleOffset?: number;
    threshold?: number;
    /** Should the element stay rendered after it becomes visible? */
    stayRendered?: boolean;
    root?: HTMLElement | null;
    /** E.g. 'span', 'tbody'. Default = 'div' */
    rootElement?: string;
    /** E.g. 'span', 'tr'. Default = 'div' */
    placeholderElement?: string;
    placeholderElementClass?: string;
    placeholderElementProps?: React.HTMLProps<HTMLTableColElement | HTMLDivElement>;
    loadingElement?: React.ReactNode;
    onShow?: () => void;
    onVisible?: (visible: boolean) => void;
}

const LazyLoadPure: ForwardRefRenderFunction<HTMLDivElement | null, Props> = (
    {
        disabled = false,
        initialVisible = false,
        defaultHeight = 300,
        visibleOffset = 1000,
        threshold = 0,
        stayRendered = false,
        root = null,
        rootElement = "div",
        className = "",
        placeholderElement = "div",
        placeholderElementClass = "",
        placeholderElementProps = {},
        children,
        loadingElement,
        onShow,
        onVisible,
        ...restProps
    },
    ref
) => {
    const [isVisible, setIsVisible] = useState<boolean>(initialVisible);
    const isVisibleRef = useRef<boolean>(initialVisible);
    const wasVisible = useRef<boolean>(initialVisible);
    const placeholderHeight = useRef<number>(defaultHeight);
    const intersectionRef = useRef<HTMLDivElement | null>(null);
    const onShowRef = useRef(onShow);
    const onVisibleRef = useRef(onVisible);
    onShowRef.current = onShow;
    onVisibleRef.current = onVisible;

    useImperativeHandle(ref, () => intersectionRef.current!, []);

    const handleChangeVisibility = useCallback(
        (visibility: boolean) => {
            if (visibility === isVisibleRef.current) return;
            if (stayRendered === true && wasVisible.current && visibility) return;

            isVisibleRef.current = visibility;
            setIsVisible(visibility);
        },
        [stayRendered]
    );

    // Set visibility with intersection observer
    useEffect(() => {
        if (intersectionRef.current) {
            const observer = new IntersectionObserver(
                entries => {
                    // Before switching off `isVisible`, set the height of the placeholder
                    if (!entries[0].isIntersecting) {
                        placeholderHeight.current = intersectionRef.current!.offsetHeight;
                    }
                    if (typeof window !== undefined && window.requestIdleCallback) {
                        window.requestIdleCallback(
                            () => {
                                handleChangeVisibility(entries[entries.length - 1].isIntersecting);

                                if (
                                    onShowRef.current &&
                                    entries[entries.length - 1].isIntersecting &&
                                    !wasVisible.current
                                ) {
                                    onShowRef.current();
                                }

                                if (onVisibleRef.current) {
                                    onVisibleRef.current(entries[entries.length - 1].isIntersecting);
                                }
                            },
                            {
                                timeout: 600,
                            }
                        );
                    } else {
                        handleChangeVisibility(entries[entries.length - 1].isIntersecting);
                    }
                },
                { root, rootMargin: `${visibleOffset}px 0px ${visibleOffset}px 0px`, threshold }
            );
            const localRef = intersectionRef.current;
            observer.observe(localRef);
            return () => localRef && observer.unobserve(localRef);
        }
    }, [handleChangeVisibility, root, threshold, visibleOffset]);

    useEffect(() => {
        if (isVisible) {
            wasVisible.current = true;
        }
    }, [isVisible]);

    const placeholderStyle = { height: placeholderHeight.current };
    const rootClasses = useMemo(
        () => `lazy-load ${className} ${isVisible ? "loaded" : "unloaded"}`,
        [className, isVisible]
    );
    const placeholderClasses = useMemo(
        () => `lazy-load-placeholder ${placeholderElementClass}`,
        [placeholderElementClass]
    );

    // eslint-disable-next-line react/no-children-prop
    return React.createElement(rootElement, {
        children:
            disabled || isVisible || (stayRendered && wasVisible.current)
                ? children
                : loadingElement
                ? loadingElement
                : React.createElement(placeholderElement, {
                      className: placeholderClasses,
                      style: placeholderStyle,
                      ...placeholderElementProps,
                  }),
        ref: intersectionRef,
        className: rootClasses,
        ...restProps,
    });
};

export const LazyLoad = React.forwardRef(LazyLoadPure);

type InViewCallback = (inView: boolean) => void;

interface ObserverGroup {
    observer: IntersectionObserver;
    callbacks: Map<Element, Set<InViewCallback>>;
}

interface ObserverGroupRegistration {
    group: ObserverGroup;
    groups: Map<string, ObserverGroup>;
    key: string;
}

const defaultObserverGroups = new Map<string, ObserverGroup>();
const rootObserverGroups = new WeakMap<Element, Map<string, ObserverGroup>>();

const getObserverGroup = (
    root: Element | null,
    rootMargin: string,
    threshold: number | number[]
): ObserverGroupRegistration | null => {
    if (typeof IntersectionObserver === "undefined") return null;

    const groups = root
        ? rootObserverGroups.get(root) ?? new Map<string, ObserverGroup>()
        : defaultObserverGroups;
    if (root) rootObserverGroups.set(root, groups);

    const key = `${rootMargin}:${Array.isArray(threshold) ? threshold.join(",") : threshold}`;
    const existing = groups.get(key);
    if (existing) return { group: existing, groups, key };

    const group: ObserverGroup = {
        callbacks: new Map(),
        observer: new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    group.callbacks.get(entry.target)?.forEach(callback => callback(entry.isIntersecting));
                }
            },
            { root, rootMargin, threshold }
        ),
    };
    groups.set(key, group);
    return { group, groups, key };
};

const useSharedInView = ({
    initialInView,
    threshold,
    triggerOnce,
    root,
}: {
    initialInView: boolean;
    threshold: number | number[];
    triggerOnce: boolean;
    root: Element | null;
}) => {
    const [inView, setInView] = useState(initialInView);
    const elementRef = useRef<Element | null>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const registration = getObserverGroup(root, "1000px 0px", threshold);
        if (!registration) {
            setInView(true);
            return;
        }

        const { group, groups, key } = registration;
        const callback: InViewCallback = visible => {
            setInView(current => (triggerOnce && current ? true : visible));
        };
        group.callbacks.set(element, new Set([callback]));
        group.observer.observe(element);

        return () => {
            group.observer.unobserve(element);
            group.callbacks.delete(element);
            if (group.callbacks.size === 0) {
                group.observer.disconnect();
                groups.delete(key);
            }
        };
    }, [root, threshold, triggerOnce]);

    const ref = useCallback((element: Element | null) => {
        elementRef.current = element;
    }, []);

    return { inView, ref };
};

interface LazyProps extends HTMLDivProps {
    /**
     * Whether the element should be visible initially or not.
     * Useful e.g. for always setting the first N items to visible.
     * Default: false
     */
    initialVisible?: boolean;
    threshold?: number;
    /** Should the element stay rendered after it becomes visible? */
    stayRendered?: boolean;
    root?: HTMLElement | null;
    /** E.g. 'span', 'tbody'. Default = 'div' */
    rootElement?: string;
    loadingElement?: React.ReactNode;
}
const LazyPure: ForwardRefRenderFunction<HTMLDivElement, LazyProps> = (
    {
        initialVisible = false,
        threshold = 0,
        stayRendered = false,
        root = null,
        rootElement = "div",
        children,
        loadingElement,
        ...restProps
    },
    extRef
) => {
    const intersectionRef = useRef<HTMLDivElement | null>(null);
    const { ref, inView } = useSharedInView({
        initialInView: initialVisible,
        threshold,
        triggerOnce: stayRendered,
        root,
    });
    useImperativeHandle(extRef, () => intersectionRef.current!, []);

    const handleSetRef = (refEl: HTMLDivElement | null) => {
        intersectionRef.current = refEl;
        ref(refEl);
    };

    // eslint-disable-next-line react/no-children-prop
    return React.createElement(rootElement, {
        children: inView ? children : loadingElement,
        ref: handleSetRef,
        ...restProps,
    });
};

export const Lazy = React.forwardRef(LazyPure);
