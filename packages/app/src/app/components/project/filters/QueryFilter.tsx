// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { FormGroup, InputGroup, Keys } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { Icon } from "app/components/common";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";

interface IQueryFilterProps {
    term: string;
    placeholder?: string;
    helperText?: string;
    label?: string;
    onChange: (query: string) => void;
    onHide: () => void;
}
/**
 * Shared filter search box: local term mirror, autofocus, and Escape / Cmd-F handling.
 * The caller supplies the store actions for setting the query and hiding the filters.
 */
export const QueryFilter: FunctionComponent<IQueryFilterProps> = ({
    term,
    placeholder = "Enter a keyword",
    helperText,
    label = translate("Search"),
    onChange,
    onHide,
}) => {
    const [query, setQuery] = useState(term);
    const queryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (queryInputRef.current) {
            queryInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        setQuery(term);
    }, [term]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.keyCode === Keys.ESCAPE || ((event.metaKey || event.ctrlKey) && event.key === "f")) {
            if (query?.length) {
                setQuery("");
                onChange("");
            } else {
                onHide();
            }
        }
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.currentTarget.value);
        onChange(event.currentTarget.value);
    };

    return (
        <FormGroup label={label} helperText={helperText}>
            <InputGroup
                value={query}
                placeholder={placeholder}
                leftIcon={<Icon icon="search" />}
                round
                type="search"
                onChange={handleChange}
                inputRef={queryInputRef}
                onKeyDown={handleKeyDown}
                data-testid="filter-query-input"
            />
        </FormGroup>
    );
};
