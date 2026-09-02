import { describe, expect, it } from "vitest";

import { parseCsv } from "./parse-csv";

describe("parseCsv", () => {
  it("parses a simple 3-column CSV with LF line endings", () => {
    const csv = "external_id,display_name,email\nc1,Alice,a@x\nc2,Bob,b@x\n";
    const r = parseCsv(csv);
    expect(r.header).toEqual(["external_id", "display_name", "email"]);
    expect(r.rows).toEqual([
      { external_id: "c1", display_name: "Alice", email: "a@x" },
      { external_id: "c2", display_name: "Bob", email: "b@x" },
    ]);
    expect(r.errors).toEqual([]);
  });

  it("parses CRLF line endings", () => {
    const csv = "a,b\r\n1,2\r\n";
    const r = parseCsv(csv);
    expect(r.rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("strips a UTF-8 BOM from the header", () => {
    const csv = "﻿f,g\n1,2\n";
    const r = parseCsv(csv);
    expect(r.header).toEqual(["f", "g"]);
    expect(r.rows).toEqual([{ f: "1", g: "2" }]);
  });

  it("handles double-quoted fields with embedded commas", () => {
    const csv = 'name,note\n"Doe, John","hello, world"\n';
    const r = parseCsv(csv);
    expect(r.rows).toEqual([{ name: "Doe, John", note: "hello, world" }]);
  });

  it("handles escaped double-quotes inside quoted fields", () => {
    const csv = 'name,quote\n"Alice","She said ""hi"""\n';
    const r = parseCsv(csv);
    expect(r.rows).toEqual([{ name: "Alice", quote: 'She said "hi"' }]);
  });

  it("reports an error for a mis-columned row and keeps parsing the rest", () => {
    const csv = "a,b\n1,2\n3\n5,6\n";
    const r = parseCsv(csv);
    expect(r.rows).toEqual([
      { a: "1", b: "2" },
      { a: "5", b: "6" },
    ]);
    expect(r.errors).toEqual([
      { rowIndex: 2, message: expect.stringContaining("expected 2 columns") },
    ]);
  });

  it("reports an error for an unterminated quoted field", () => {
    const csv = "a,b\n1,\"unterminated\n";
    const r = parseCsv(csv);
    expect(r.errors.some((e) => e.message.includes("unterminated"))).toBe(true);
  });

  it("rejects an empty file", () => {
    const r = parseCsv("");
    expect(r.errors).toEqual([{ rowIndex: 0, message: "empty file" }]);
  });

  it("rejects a header with a blank column name", () => {
    const r = parseCsv("a,,c\n1,2,3\n");
    expect(r.errors.some((e) => e.message.includes("blank column"))).toBe(true);
  });

  it("skips trailing blank lines", () => {
    const csv = "a\n1\n\n\n";
    const r = parseCsv(csv);
    expect(r.rows).toEqual([{ a: "1" }]);
    expect(r.errors).toEqual([]);
  });
});
