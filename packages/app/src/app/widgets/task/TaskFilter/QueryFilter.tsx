// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { FormGroup, InputGroup } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { Icon } from "app/components/common/Icon/Icon";
import React, { FunctionComponent, memo, useEffect, useRef, useState } from "react";

interface IQueryFilterProps {
    term: string;
    placeholder?: string;
    helperText?: string;
    label?: string;
    onChange: (query: string) => void;
    onHide: () => void;
}

/**
 * Shared filter search box with a local term mirror, autofocus, and Escape / Cmd-F handling.
 * The caller supplies the query action and drawer visibility callback.
 */
export const QueryFilter: FunctionComponent<IQueryFilterProps> = memo(function QueryFilter({
    term,
    placeholder = "Enter a keyword",
    helperText,
    label = translate("Search"),
    onChange,
    onHide,
}) {
    const [query, setQuery] = useState(term);
    const queryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        queryInputRef.current?.focus();
    }, []);

    useEffect(() => {
        setQuery(term);
    }, [term]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape" || ((event.metaKey || event.ctrlKey) && event.key === "f")) {
            if (query.length) {
                setQuery("");
                onChange("");
            } else {
                onHide();
            }
        }
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.currentTarget.value;
        setQuery(value);
        onChange(value);
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
});
