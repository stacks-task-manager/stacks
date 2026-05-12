// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Menu } from "@blueprintjs/core";
import { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import React, {
    forwardRef,
    ForwardRefRenderFunction,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import scrollIntoView from "scroll-into-view-if-needed";

import { BlankSlate, Scroller } from "app/components/common";
import { PersonItem } from "app/widgets/people";
import { APPICONS } from "@stacks/types";

export const useIsMounted = () => {
    const isMounted = useRef(true);
    useEffect(
        () => () => {
            isMounted.current = false;
        },
        []
    );
    return isMounted;
};

type MentionListProps = SuggestionProps;

interface MentionListActions {
    onKeyDown: (props: SuggestionKeyDownProps) => void;
}

const MentionListRef: ForwardRefRenderFunction<MentionListActions, MentionListProps> = (
    { command, items },
    ref
) => {
    const handleCommand = (e: React.MouseEvent | React.KeyboardEvent | KeyboardEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (!items.length) return;
        const selectedPerson = items[index];
        command({ id: selectedPerson.id, label: `${selectedPerson.firstName} ${selectedPerson.lastName}` });
    };

    const [hoverIndex, setHoverIndex] = useState(0);

    useEffect(() => {
        if (!items.length) return;

        const personMenuItem = document.getElementById(`person-${items[hoverIndex].id}`);
        if (personMenuItem) {
            scrollIntoView(personMenuItem, { behavior: "smooth", block: "center" });
        }
    }, [hoverIndex]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            const { key } = event;

            if (key === "ArrowUp") {
                setHoverIndex(prev => {
                    const beforeIndex = prev - 1;
                    return beforeIndex >= 0 ? beforeIndex : 0;
                });
                return true;
            }

            if (key === "ArrowDown") {
                setHoverIndex(prev => {
                    const afterIndex = prev + 1;
                    const peopleCount = items.length - 1 < 0 ? 0 : items.length - 1;
                    return afterIndex < peopleCount ? afterIndex : peopleCount;
                });
                return true;
            }

            if (key === "Enter") {
                handleCommand(event, hoverIndex);
                return true;
            }

            return false;
        },
    }));

    return (
        <div className={Classes.POPOVER}>
            <div className={Classes.POPOVER_CONTENT}>
                <Scroller maxHeight={300} thin>
                    {items.length ? (
                        <Menu>
                            {items.map((person, index) => (
                                <PersonItem
                                    key={person.id}
                                    person={person}
                                    active={index === hoverIndex}
                                    small
                                    onClick={e => handleCommand(e, index)}
                                />
                            ))}
                        </Menu>
                    ) : (
                        <BlankSlate
                            icon={APPICONS.PEOPLE}
                            title="People"
                            description="No people found with the entered query"
                            maxWidth={180}
                            small
                        />
                    )}
                </Scroller>
            </div>
        </div>
    );
};

export const MentionList = forwardRef(MentionListRef);
