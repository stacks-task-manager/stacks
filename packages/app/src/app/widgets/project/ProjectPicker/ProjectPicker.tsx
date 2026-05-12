// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, InputGroup, Menu, MenuItem } from "@blueprintjs/core";
import classnames from "classnames";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { Icon, BlankSlate, Scroller } from "app/components/common";
import { TreeNode } from "@stacks/types";
import { RecordActions } from "app/store/actions";
import { scrollIntoView } from "app/utils/dom";

interface ProjectPickerProps {
    value?: string;
    contained?: boolean;
    shouldDismissPopover?: boolean;
    onChange: (projectId: string) => void;
    onClose?: () => void;
}
export const ProjectPicker: FunctionComponent<ProjectPickerProps> = ({
    value,
    contained,
    shouldDismissPopover,
    onChange,
    onClose,
}) => {
    const [query, setQuery] = useState("");
    const [projects, setProjects] = useState<TreeNode[]>([]);
    const selectedRef = useRef<number | undefined>(undefined);
    const [selected, setSelected] = useState<number | undefined>();
    const debounce = useRef<NodeJS.Timeout | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const dismissRef = useRef<HTMLButtonElement>(null);

    const filteredProjects = useMemo(() => {
        if (query.length) {
            return projects.filter(project => project.title.toLowerCase().includes(query.toLowerCase()));
        }
        return projects;
    }, [query, projects]);

    useEffect(() => {
        if (selected == null) return;
        const projectEl = document.getElementById(`project-menu-item-${projects[selected].id}`);
        scrollIntoView(projectEl);
    }, [selected]);

    useEffect(() => {
        const projects = RecordActions.getProjects();
        setProjects(projects);
    }, [query]);

    const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }
        const query = event.target.value;
        debounce.current = setTimeout(() => {
            setQuery(query);
        }, 300);
    };

    const handleSelectProject = (project: TreeNode) => {
        onChange(`${project.id}`);
    };

    const selectActive = () => {
        if (selected != null) {
            handleSelectProject(filteredProjects[selected]);
        }
    };

    const gotoNextItem = () => {
        if (selectedRef.current == null) {
            selectedRef.current = 0;
        } else {
            selectedRef.current =
                selectedRef.current + 1 < filteredProjects.length ? selectedRef.current + 1 : 0;
        }

        setSelected(selectedRef.current);
    };

    const gotoPrevItem = () => {
        if (selectedRef.current == null) {
            selectedRef.current = 0;
        } else {
            selectedRef.current =
                selectedRef.current - 1 < 0 ? filteredProjects.length - 1 : selectedRef.current - 1;
        }

        setSelected(selectedRef.current);
    };

    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            gotoNextItem();
        } else if (event.key === "ArrowUp") {
            gotoPrevItem();
        } else if (event.key === "Enter") {
            selectActive();
            if (dismissRef.current) {
                dismissRef.current.click();
            }
        } else if (event.key === "Escape") {
            if (event.currentTarget.value.trim().length === 0) {
                if (dismissRef.current) {
                    dismissRef.current.click();
                }
                if (onClose) onClose();
            } else {
                setQuery("");
                selectedRef.current = undefined;
                setSelected(undefined);
                if (searchRef.current) {
                    searchRef.current.value = "";
                }
            }
        }
    };

    return (
        <div className={classnames("project-picker", { contained })}>
            <div style={{ padding: 5 }}>
                <button ref={dismissRef} className={Classes.POPOVER_DISMISS} style={{ display: "none" }} />
                <InputGroup
                    leftIcon={<Icon icon="search" />}
                    placeholder={`${translate("Search")}...`}
                    autoFocus
                    type="search"
                    inputRef={searchRef}
                    onKeyDown={handleOnKeyDown}
                    onChange={handleQueryChange}
                />
            </div>

            {filteredProjects.length === 0 ? (
                <BlankSlate
                    small
                    title={
                        query.length && !filteredProjects.length ? "Project not found" : "Search a project"
                    }
                    icon="search"
                />
            ) : (
                <Scroller maxHeight={300} vertical thin>
                    <Menu>
                        {filteredProjects.map((project: TreeNode, index: number) => {
                            const isActive = value === project.id;
                            return (
                                <MenuItem
                                    key={project.id}
                                    id={`project-menu-item-${project.id}`}
                                    text={project.title}
                                    shouldDismissPopover={shouldDismissPopover || false}
                                    labelElement={isActive ? <Icon icon="check" /> : undefined}
                                    active={selected === index}
                                    onClick={() => handleSelectProject(project)}
                                />
                            );
                        })}
                    </Menu>
                </Scroller>
            )}
        </div>
    );
};
