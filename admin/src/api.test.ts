import { describe, it, expect } from "vitest";
import { makeApi, ApiError, SECTIONS } from "./api";

describe("admin API mijozi", () => {
  it("Bearer token yuboradi, xatoni ApiError qiladi", async () => {
    const calls: any[] = [];
    const f = (async (url: string, init: any) => { calls.push([url, init]); return { ok: init.method === "GET", status: init.method === "GET" ? 200 : 403, json: async () => ({ error: "forbidden", x: 1 }) }; }) as any;
    const api = makeApi("T", "http://s", f);
    expect(await api.get("/a")).toEqual({ error: "forbidden", x: 1 });
    expect(calls[0][1].headers.authorization).toBe("Bearer T");
    await expect(api.post("/b", { q: 1 })).rejects.toBeInstanceOf(ApiError);
    expect(calls[1][1].body).toBe('{"q":1}');
  });
  it("bo'limlar roli bo'yicha: muharrir faqat kontent, analitik shaxsiy ma'lumotsiz", () => {
    expect(SECTIONS.content_editor).toEqual(["content"]);
    expect(SECTIONS.analyst).not.toContain("users");
    expect(SECTIONS.support).not.toContain("content");
  });
});
