import { describe, expect, it, vi } from "vitest";
import { allRows } from "./pagination";
describe("complete inventory pagination", () => {
  it("collects more than the API row cap and follows actual returned length", async () => {
    const rows = Array.from({ length: 1201 }, (_, id) => ({ id }));
    const page = vi.fn(async (from: number) => ({ data: rows.slice(from, from + 300), count: rows.length, error: null }));
    expect(await allRows(page)).toEqual({ data: rows, error: null });
    expect(page).toHaveBeenCalledTimes(5);
    expect(page.mock.calls.map(call => call[0])).toEqual([0, 300, 600, 900, 1200]);
  });
  it("fails closed if rows disappear during pagination", async () => {
    let calls = 0;
    const result = await allRows(async () => ({ data: calls++ ? [] : [{ id: 1 }], count: 2, error: null }));
    expect(result.error).toBeInstanceOf(Error); expect(result.data).toEqual([]);
  });
  it("does not combine snapshots with different record counts", async () => {
    let calls = 0;
    expect((await allRows(async () => ({ data: [{ id: 1 }], count: calls++ ? 3 : 2, error: null }))).error).toBeInstanceOf(Error);
  });
  it("distinguishes a verified empty inventory from a failed query", async () => {
    expect(await allRows(async () => ({ data: [], count: 0, error: null }))).toEqual({ data: [], error: null });
    expect((await allRows(async () => ({ data: null, count: null, error: new Error("offline") }))).error).toBeInstanceOf(Error);
  });
});
