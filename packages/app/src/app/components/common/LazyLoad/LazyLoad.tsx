// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HTMLDivProps } from "@blueprintjs/core";
import React, {
    ForwardRefRenderFunction,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import { useInView } from "react-intersection-observer";

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
    const wasVisible = useRef<boolean>(initialVisible);
    const placeholderHeight = useRef<number>(defaultHeight);
    const intersectionRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => intersectionRef.current!, []);

    const handleChangeVisibility = (visibility: boolean) => {
        if (visibility === isVisible) return;
        if (stayRendered === true && wasVisible.current && visibility) return;

        setIsVisible(visibility);
    };

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
                                    onShow &&
                                    entries[entries.length - 1].isIntersecting &&
                                    !wasVisible.current
                                ) {
                                    onShow();
                                }

                                if (onVisible) {
                                    onVisible(isVisible);
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
    }, []);

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
    rootElement?: keyof JSX.IntrinsicElements;
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
    const { ref, inView } = useInView({
        threshold,
        initialInView: initialVisible,
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
