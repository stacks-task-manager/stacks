import React from 'react';
export default function useDragResize(handleResize: ({ width }: {
    width: number;
}) => void, { initSize, minWidth: minWidthConfig, maxWidth: maxWidthConfig, }: {
    initSize: {
        width: number;
    };
    minWidth?: number;
    maxWidth?: number;
}): [(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void, boolean];
