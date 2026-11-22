import type { RoomVisibility, RoomStart } from "../net/http";

/** Xona parametrlari (foydalanuvchi tanlamaydi): Standart — ro'yxatda ochiq, Student — qulfli (kod bilan), Korporativ — ochiq (vaqtincha). Boshlash — xona egasi bosganda; o'rinlar qolsa botlar to'ldiradi. */
export interface RoomOpts { visibility: RoomVisibility; start: RoomStart; kind: "standard" | "student" }
export const defaultVisibility = (mode: "standard" | "student" | "corporate"): RoomVisibility => (mode === "student" ? "locked" : "open");
export const defaultOpts = (mode: "standard" | "student" | "corporate" = "standard"): RoomOpts => ({ visibility: defaultVisibility(mode), start: "host", kind: mode === "student" ? "student" : "standard" });
