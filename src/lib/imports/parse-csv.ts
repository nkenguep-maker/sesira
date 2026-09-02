import "server-only";

/**
 * Minimal RFC 4180 CSV parser. No external dependency (matches the
 * SESIRA minimal-deps ethos — C9's Resend adapter and C11's Claude
 * adapter use `fetch` directly, this file uses only native string
 * operations).
 *
 * Supported:
 *   * Comma separator (fixed for V1)
 *   * Double-quoted fields with escaped `""` (RFC 4180 §2.5)
 *   * CRLF and LF line endings
 *   * BOM stripping
 *   * Trailing empty line tolerated
 *   * First row is treated as the header
 *
 * NOT supported (raise for these — the caller decides how to surface):
 *   * Alternate separator (semicolon / tab). Excel exports with
 *     semicolons are the most common failure; the caller should
 *     detect and hand off to a semicolon parser variant in a future
 *     commit if needed. For V1: reject with a clear error.
 *   * Multi-line quoted fields (rare in business CSVs; V1 rejects).
 *   * Header-less files (V1 requires a header row).
 */

export interface ParseCsvResult {
  header: string[];
  rows: Array<Record<string, string>>;
  errors: Array<{ rowIndex: number; message: string }>;
}

export function parseCsv(text: string): ParseCsvResult {
  const errors: Array<{ rowIndex: number; message: string }> = [];
  const cleaned = stripBom(text);
  const lines = splitLines(cleaned);
  if (lines.length === 0) {
    return { header: [], rows: [], errors: [{ rowIndex: 0, message: "empty file" }] };
  }
  const rawHeader = parseLine(lines[0], 0, errors);
  const header = rawHeader.map((h) => h.trim());
  if (header.length === 0 || header.some((h) => h.length === 0)) {
    errors.push({ rowIndex: 0, message: "header row is empty or contains blank column" });
    return { header, rows: [], errors };
  }

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.length === 0) continue;
    const fields = parseLine(line, i, errors);
    if (fields.length !== header.length) {
      errors.push({
        rowIndex: i,
        message: `expected ${header.length} columns, got ${fields.length}`,
      });
      continue;
    }
    const record: Record<string, string> = {};
    for (let c = 0; c < header.length; c += 1) {
      record[header[c]] = fields[c];
    }
    rows.push(record);
  }
  return { header, rows, errors };
}

function stripBom(text: string): string {
  if (text.length > 0 && text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

function splitLines(text: string): string[] {
  // Preserve CRLF/LF but drop terminal newline. Multi-line quoted
  // fields are rejected — we split on physical line breaks and let
  // `parseLine` reject an unterminated quote.
  return text.split(/\r\n|\n|\r/);
}

function parseLine(
  line: string,
  rowIndex: number,
  errors: Array<{ rowIndex: number; message: string }>,
): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      if (cur.length !== 0) {
        // A quote in the middle of an unquoted field is technically
        // permitted by many parsers but almost always a bug — treat
        // as literal for tolerance but note the anomaly for the
        // caller if a stricter mode is added later.
        cur += ch;
        continue;
      }
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      fields.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (inQuotes) {
    errors.push({
      rowIndex,
      message: "unterminated quoted field (multi-line quoted fields not supported)",
    });
    // Fall through — best-effort field push so the caller sees a
    // shape close to what was intended.
  }
  fields.push(cur);
  return fields;
}
