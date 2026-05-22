// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from 'classnames';
import { addDays, isAfter, isBefore, isSameDay, isWeekend, subDays } from 'date-fns';
import React, {
    forwardRef,
    ReactNode,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,

} from 'react';


interface InfiniteDateBoardProps {
    initialDate: Date;
    yearsToSupport?: number;
    columnWidth?: number;
    columnGap?: number;
    className?: string;
    onDatesLoaded: (startDate: Date, endDate: Date) => void;
    columnRenderer: (date: Date) => ReactNode;
}

export interface InfiniteDateBoardPropsRef {
    today: () => void;
    next: () => void;
    prev: () => void;
}

const YEARS_TO_SUPPORT = 4; // How many years to scroll into the past AND future
const DAYS_PER_YEAR = 365.25;

export const InfiniteDateBoard = forwardRef<InfiniteDateBoardPropsRef, InfiniteDateBoardProps>(
    (props, ref) => {
        const { initialDate, className, yearsToSupport, columnWidth, columnGap, onDatesLoaded, columnRenderer } = props;
        const COLUMN_WIDTH = columnWidth ?? 300;
        const GAP = columnGap ?? 15;
        const STEP = COLUMN_WIDTH + GAP;
        /**
         * TOTAL_DAYS = (Years * Days/Year * 2 for both directions)
         * VIRTUAL_CANVAS_WIDTH = Total Days * Step size
         */
        const TOTAL_DAYS_SUPPORTED = Math.floor((yearsToSupport ?? YEARS_TO_SUPPORT) * DAYS_PER_YEAR * 2);
        const VIRTUAL_CANVAS_WIDTH = TOTAL_DAYS_SUPPORTED * STEP;
        const CENTER_OFFSET = VIRTUAL_CANVAS_WIDTH / 2;


        const containerRef = useRef<HTMLDivElement>(null);
        const [containerWidth, setContainerWidth] = useState(0);
        const [scrollLeft, setScrollLeft] = useState(CENTER_OFFSET);

        const isDragging = useRef(false);
        const startX = useRef(0);
        const scrollLeftStart = useRef(0);

        useLayoutEffect(() => {
            if (containerRef.current) {
                containerRef.current.scrollLeft = CENTER_OFFSET;
            }
        }, []);

        useEffect(() => {
            if (!containerRef.current) return;
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setContainerWidth(entry.contentRect.width);
                }
            });
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }, []);

        const visibleInfo = useMemo(() => {
            const relativeScroll = scrollLeft - CENTER_OFFSET;
            const threshold = COLUMN_WIDTH / 2;

            const firstVisibleIdx = Math.floor((relativeScroll + threshold) / STEP);
            const lastVisibleIdx = Math.floor((relativeScroll + containerWidth - threshold) / STEP);

            return {
                firstVisibleIdx,
                lastVisibleIdx,
                renderStart: firstVisibleIdx - 3,
                renderEnd: lastVisibleIdx + 3,
            };
        }, [scrollLeft, containerWidth]);

        const getDateFromOffset = useCallback((offset: number) => {
            const d = new Date(initialDate);
            d.setDate(d.getDate() + offset);
            return d;
        }, [initialDate]);

        useEffect(() => {
            if (containerWidth === 0) return;
            onDatesLoaded(
                getDateFromOffset(visibleInfo.firstVisibleIdx),
                getDateFromOffset(visibleInfo.lastVisibleIdx)
            );
        }, [visibleInfo.firstVisibleIdx, visibleInfo.lastVisibleIdx, containerWidth, getDateFromOffset, onDatesLoaded]);

        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
            setScrollLeft(e.currentTarget.scrollLeft);
        };

        const handleMouseDown = (e: React.MouseEvent) => {
            if ((e.target as HTMLElement).closest('.task-card-outer')) {
                return;
            }

            isDragging.current = true;
            startX.current = e.pageX - (containerRef.current?.offsetLeft || 0);
            scrollLeftStart.current = containerRef.current?.scrollLeft || 0;
        };

        const handleMouseLeave = () => {
            isDragging.current = false;
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };

        const handleMouseMove = (e: React.MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            e.preventDefault();
            const x = e.pageX - containerRef.current.offsetLeft;
            const walk = (x - startX.current);
            containerRef.current.scrollLeft = scrollLeftStart.current - walk;
        };

        useImperativeHandle(ref, () => ({
            today: () => containerRef.current?.scrollTo({ left: CENTER_OFFSET, behavior: 'smooth' }),
            next: () => containerRef.current?.scrollBy({ left: STEP, behavior: 'smooth' }),
            prev: () => containerRef.current?.scrollBy({ left: -STEP, behavior: 'smooth' }),
        }));

        return (
            <div className={classNames("infinite-date-board", className)}>
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="infinite-date-board-container"
                    style={{ paddingLeft: GAP }}
                >
                    <div
                        className="infinite-date-board-inner"
                        style={{ width: VIRTUAL_CANVAS_WIDTH }}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                    >
                        {/* Spacer to push columns to the correct position */}
                        <div style={{ width: `${CENTER_OFFSET + visibleInfo.renderStart * STEP}px`, flexShrink: 0 }} />

                        {/* We only map the buffer range, keeping the DOM light */}
                        {Array.from({ length: visibleInfo.renderEnd - visibleInfo.renderStart + 1 }).map((_, index) => {
                            const i = visibleInfo.renderStart + index;
                            const date = getDateFromOffset(i);
                            return (
                                <div
                                    className={classNames("infinite-date-board-column", {
                                        "is-weekend": isWeekend(date),
                                        "is-today": isSameDay(date, new Date()),
                                        "is-past": isBefore(date, subDays(new Date(), 1)),
                                        "is-future": isAfter(date, addDays(new Date(), 1)),
                                    })}
                                    key={i}
                                    style={{
                                        width: `${COLUMN_WIDTH}px`,
                                        marginRight: `${GAP}px`,
                                    }}
                                >
                                    {columnRenderer(date)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
);

InfiniteDateBoard.displayName = "InfiniteDateBoard";
