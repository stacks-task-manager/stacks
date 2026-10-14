/** A numeric position or a column anchor in the current board order. */
export type StackPosition = number | { beforeStackId: string } | { afterStackId: string };

export function stackInsertIndex(order: string[], position?: StackPosition): number {
    if (position === undefined) return order.length;
    if (typeof position === "number") return position;
    const before = "beforeStackId" in position;
    const anchor = before ? position.beforeStackId : position.afterStackId;
    const index = order.indexOf(anchor);
    if (index < 0) throw new Error("The reference column is no longer in this project.");
    return index + (before ? 0 : 1);
}
