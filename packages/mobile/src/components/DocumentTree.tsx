// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { memo, useMemo } from "react";
import { RECORDTYPE, type TreeNode } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

import { Icon, type IconName } from "./Icon/Icon";

export type DocTreeNode = TreeNode & { children: DocTreeNode[] };

/**
 * `parent === ROOT_PARENT` means the document lives at the top level of the
 * workspace tree. Matches the value the server stamps via
 * `packages/server/src/loaders/documents.ts#sanitizeDocument`.
 */
const ROOT_PARENT = "00000000-0000-0000-0000-000000000000";

/**
 * Group the flat document list coming from `/api/documents` into an actual
 * tree keyed by `parent`. Returns the top-level nodes plus any orphan
 * subtrees whose parent is missing (promoted to root, so the user can still
 * reach them).
 */
export function buildDocumentTree(documents: TreeNode[]): DocTreeNode[] {
    const byParent = new Map<string, DocTreeNode[]>();
    const ids = new Set<string>();
    for (const doc of documents) ids.add(doc.id);

    for (const doc of documents) {
        const node: DocTreeNode = { ...doc, children: [] };
        const parentKey = doc.parent && ids.has(doc.parent) ? doc.parent : ROOT_PARENT;
        const bucket = byParent.get(parentKey) ?? [];
        bucket.push(node);
        byParent.set(parentKey, bucket);
    }

    const attach = (node: DocTreeNode) => {
        const children = byParent.get(node.id) ?? [];
        children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        for (const child of children) attach(child);
        node.children = children;
    };

    const roots = byParent.get(ROOT_PARENT) ?? [];
    roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const root of roots) attach(root);
    return roots;
}

/** Sprite icon shown on the left of each row to hint at the document type. */
function iconFor(type: RECORDTYPE, expanded: boolean): IconName {
    switch (type) {
        case RECORDTYPE.FOLDER:
            return expanded ? "folder-minus" : "folder-plus";
        case RECORDTYPE.PROJECT:
            return "check-circle-broken";
        case RECORDTYPE.NOTEPAD:
            return "book-closed";
        default:
            return "file";
    }
}

function DocumentRowBase({
    node,
    depth,
    expanded,
    onToggle,
    onPress,
    onAddChild,
}: {
    node: DocTreeNode;
    depth: number;
    expanded: boolean;
    onToggle: (id: string) => void;
    onPress: (node: DocTreeNode) => void;
    onAddChild: (node: DocTreeNode) => void;
}) {
    const isFolder = node.type === RECORDTYPE.FOLDER;
    const indent = 8 + depth * 14;

    return (
        <HStack className="items-center pr-2 border-b border-outline-100">
            <Pressable
                onPress={() => (isFolder ? onToggle(node.id) : onPress(node))}
                onLongPress={isFolder ? () => onAddChild(node) : undefined}
                delayLongPress={350}
                style={{ paddingLeft: indent }}
                className="flex-1 py-2.5 active:bg-background-100"
            >
                <HStack space="sm" className="items-center">
                    <Box className="w-5 items-center">
                        <Icon icon={iconFor(node.type, expanded)} size={18} color="#64748b" />
                    </Box>
                    <Text
                        size="md"
                        numberOfLines={1}
                        className="flex-1 text-typography-900"
                    >
                        {node.title}
                    </Text>
                </HStack>
            </Pressable>
            {isFolder ? (
                <Pressable onPress={() => onAddChild(node)} hitSlop={8} className="px-1.5 py-1.5">
                    <Icon icon="plus" size={18} color="#2563eb" />
                </Pressable>
            ) : null}
        </HStack>
    );
}

const DocumentRow = memo(DocumentRowBase);

export function DocumentTree({
    nodes,
    expanded,
    onToggle,
    onPress,
    onAddChild,
}: {
    nodes: DocTreeNode[];
    expanded: Set<string>;
    onToggle: (id: string) => void;
    onPress: (node: DocTreeNode) => void;
    onAddChild: (node: DocTreeNode) => void;
}) {
    const flat = useMemo(() => {
        const out: { node: DocTreeNode; depth: number }[] = [];
        const walk = (list: DocTreeNode[], depth: number) => {
            for (const node of list) {
                out.push({ node, depth });
                if (node.type === RECORDTYPE.FOLDER && expanded.has(node.id)) {
                    walk(node.children, depth + 1);
                }
            }
        };
        walk(nodes, 0);
        return out;
    }, [nodes, expanded]);

    return (
        <Box>
            {flat.map(({ node, depth }) => (
                <DocumentRow
                    key={node.id}
                    node={node}
                    depth={depth}
                    expanded={expanded.has(node.id)}
                    onToggle={onToggle}
                    onPress={onPress}
                    onAddChild={onAddChild}
                />
            ))}
        </Box>
    );
}
