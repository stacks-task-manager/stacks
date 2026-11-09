const fieldsWithoutTaskLog = new Set(["created", "updated", "comment", "comments"]);

export function shouldLogTaskChange(field: string): boolean {
    return !fieldsWithoutTaskLog.has(field);
}
