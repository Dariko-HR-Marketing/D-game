import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PgStore } from "./pgstore";
import { newGame } from "@poyga/rules";
import { buildCtx } from "./ctx";

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("PgStore (TEST_DATABASE_URL kerak)", () => {
  let st: PgStore;
  beforeAll(async () => { st = PgStore.connect(url!); await st.migrate(); });
  afterAll(async () => { await st.close(); });

  it("snapshot saqlanadi va aynan qaytadi", async () => {
    const code = `T${Date.now()}`; const s = newGame(buildCtx(), ["a", "b"], 5);
    await st.saveSnapshot(code, s);
    expect(await st.loadSnapshot(code)).toEqual(s);
  });
  it("jurnal tartibda, takroriy seq rad etiladi", async () => {
    const code = `J${Date.now()}`; await st.saveSnapshot(code, newGame(buildCtx(), ["a", "b"], 5));
    await st.append(code, { seq: 2, at: 2000, action: { type: "roll", playerId: "a" } });
    await st.append(code, { seq: 1, at: 1000, action: { type: "roll", playerId: "b" } });
    expect((await st.journal(code)).map((e) => e.seq)).toEqual([1, 2]);
    await expect(st.append(code, { seq: 2, at: 3000, action: { type: "roll", playerId: "a" } })).rejects.toThrow();
  });
});
