import "server-only";

/**
 * Small RFC 4180-style CSV parser tailored to SESIRA imports.
 *
 * Supported:
 *   * Comma or semicolon separator, auto-detected from the header
 *   * Double-quoted fields with escaped `""` (RFC 4180 §2.5)
 *   * CRLF and LF line endings
 *   * UTF-8 BOM stripping
 *   * Trailing empty lines
 *   * Header validation, including duplicate column names
 *
 * Multi-line quoted fields remain deliberately unsupported: a malformed
 * business export is surfaced as an explicit row error instead of being
 * guessed into a different record shape.
 */

export interface ParseCsvResult {
  header: string[];
  rows: Array<Record<string, string>>;
  errors: Array<{ rowIndex: number; message: string }>;
}

type Delimiter = "," | ";";

export function parseCsv(text: string): ParseCsvResult {
  const errors: Array<{ rowIndex: number; message: string }> = [];
  const cleaned = stripBom(text);
  if (cleaned.length === 0) {
    return { header: [], rows: [], errors: [{ rowIndex: 0, message: "empty file" }] };
  }

  const lines = splitLines(cleaned);
  const delimiter = detectDelimiter(lines[0]);
  const rawHeader = parseLine(lines[0], 0, errors, delimiter);
  const header = rawHeader.map((h) => h.trim());

  if (header.length === 0 || header.some((h) => h.length === 0)) {
    errors.push({ rowIndex: 0, message: "header row is empty or contains blank column" });
    return { header, rows: [], errors };
  }

  const duplicates = duplicateHeaders(header);
  if (duplicates.length > 0) {
    errors.push({ rowIndex: 0, message: `duplicate header column: ${duplicates.join(", ")}` });
    return { header, rows: [], errors };
  }

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.length === 0) continue;
    const beforeErrors = errors.length;
    const fields = parseLine(line, i, errors, delimiter);
    if (errors.length > beforeErrors) continue;
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
  return text.split(/\r\n|\n|\r/);
}

function detectDelimiter(headerLine: string): Delimiter {
  const commas = countDelimiterOutsideQuotes(headerLine, ",");
  const semicolons = countDelimiterOutsideQuotes(headerLine, ";");
  return semicolons > commas ? ";" : ",";
}

function countDelimiterOutsideQuotes(line: string, delimiter: Delimiter) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && line[i] === delimiter) count += 1;
  }
  return count;
}

function duplicateHeaders(header: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of header) {
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates];
}

function parseLine(
  line: string,
  rowIndex: number,
  errors: Array<{ rowIndex: number; message: string }>,
  delimiter: Delimiter,
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
        cur += ch;
        continue;
      }
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
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
  }
  fields.push(cur);
  return fields;
}
