/** Avatar rasmi manzili: server nisbiy yo'l beradi (`/avatar/<id>?v=..&s=..`), mijoz API manziliga biriktiradi. */
let base = "";
export const setAvatarBase = (b: string) => { base = b.replace(/\/$/, ""); };
export const avatarUrl = (path?: string | null) => (path ? base + path : undefined);
