// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Menu, MenuItem } from "@blueprintjs/core";
import { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import React, {
    forwardRef,
    ForwardRefRenderFunction,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import type { EmojiItem } from "@tiptap/extension-emoji";

import { Scroller } from "app/components/common";

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
    { command, query, editor },
    ref
) => {
    const isMounted = useIsMounted();
    const [emojis, setEmojis] = useState<EmojiItem[]>([]);

    useEffect(() => {
        const sanitizedQuery = query.trim().toLowerCase();

        setEmojis(
            editor.storage.emoji.emojis
                .filter((emoji: EmojiItem) => {
                    return (
                        emoji.shortcodes.find(shortcode => shortcode.startsWith(sanitizedQuery)) ||
                        emoji.tags.find(tag => tag.startsWith(sanitizedQuery))
                    );
                })
                .slice(0, 5)
        );
    }, [query, isMounted]);

    const handleCommand = (index: number) => {
        if (!emojis.length) return;
        const selectedEmoji = emojis[index];
        command({ name: selectedEmoji.name });
    };

    const [hoverIndex, setHoverIndex] = useState(0);

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
                    const emojisCount = emojis.length - 1 < 0 ? 0 : emojis.length - 1;
                    return afterIndex < emojisCount ? afterIndex : emojisCount;
                });
                return true;
            }

            if (key === "Enter") {
                handleCommand(hoverIndex);
                return true;
            }

            return false;
        },
    }));

    return (
        <div className={Classes.POPOVER}>
            <div className={Classes.POPOVER_CONTENT}>
                <Scroller maxHeight={300} thin>
                    <Menu>
                        {emojis.map((emoji, index) => (
                            <MenuItem
                                icon={<>{emoji.emoji}</>}
                                text={`:${emoji.name}:`}
                                key={index}
                                active={index === hoverIndex}
                                onClick={() => handleCommand(index)}
                            />
                        ))}
                    </Menu>
                </Scroller>
            </div>
        </div>
    );
};

export const MentionList = forwardRef(MentionListRef);
