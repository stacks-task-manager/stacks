// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { ForwardRefRenderFunction, useState, useImperativeHandle, useRef, useEffect } from "react";

import { getLineHeight } from "app/utils/dom";

const MIN_ROWS = 1;
const MAX_ROWS = 10;

export type TextareaHandle = {
    input: HTMLTextAreaElement | null;
    focus: () => void;
};

interface ITextareaProps
    extends React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement> {
    rows?: number;
    minRows?: number;
    maxRows?: number;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onValueChange?: (value: string) => void;
}
const TextareaInner: ForwardRefRenderFunction<TextareaHandle, ITextareaProps> = (props, ref) => {
    const { minRows, onValueChange, ...restProps } = props;
    const [rows, setRows] = useState<number>(props.rows || 1);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(
        ref,
        () => {
            return {
                input: inputRef.current,
                focus: () => {
                    inputRef.current && inputRef.current.focus();
                },
            };
        },
        []
    );

    useEffect(() => {
        fixHeight(inputRef.current);
    }, [props.value]);

    const fixHeight = (input: HTMLTextAreaElement | null) => {
        if (input) {
            const maxRows = props.maxRows || MAX_ROWS;
            const textareaLineHeight = getLineHeight(input);
            const previousRows = input.rows;
            input.rows = minRows || MIN_ROWS; // reset number of rows in textarea

            const currentRows = ~~(input.scrollHeight / textareaLineHeight);

            if (currentRows === previousRows) {
                input.rows = currentRows;
            }

            if (currentRows >= MAX_ROWS) {
                input.rows = MAX_ROWS;
                // input.scrollTop = input.scrollHeight;
            }

            setRows(currentRows < maxRows ? currentRows : maxRows);
        }
    };

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        // fixHeight(event.target);

        if (props.onChange) {
            props.onChange(event);
        }

        if (onValueChange) onValueChange(event.target.value);
    };

    return <textarea ref={inputRef} rows={rows} {...restProps} onChange={handleChange} />;
};

export const Textarea = React.forwardRef(TextareaInner);
