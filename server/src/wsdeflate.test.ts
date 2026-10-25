// WebSocket siqish: holat xabarlari permessage-deflate bilan (mobil trafik kam; 1 KB dan kichiklari siqilmaydi).
import { describe, it, expect } from "vitest";
import WebSocket from "ws";
import { buildApp } from "./app";

describe("WebSocket permessage-deflate", () => {
  it("mijoz so'rasa siqish kelishiladi va xabarlar buzilmay yetib keladi", async () => {
    const x = buildApp(); await x.app.listen({ port: 0 }); const port = (x.app.server.address() as any).port;
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=wsdeflate`, { perMessageDeflate: true });
    const msgs: any[] = []; ws.on("message", (d) => msgs.push(JSON.parse(String(d))));
    await new Promise<void>((res, rej) => { ws.on("open", () => res()); ws.on("error", rej); });
    expect(ws.extensions).toContain("permessage-deflate");
    ws.send(JSON.stringify({ type: "create" })); await new Promise((r) => setTimeout(r, 400));
    expect(msgs.length).toBeGreaterThan(0); ws.close(); await x.app.close();
  });
});
