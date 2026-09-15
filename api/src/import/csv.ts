import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string>;

export function parseCsv(buffer: Buffer): CsvRow[] {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as CsvRow[];
  return records.map((row) => {
    const out: CsvRow = {};
    for (const [k, v] of Object.entries(row)) {
      out[k.trim()] = typeof v === "string" ? v.trim() : String(v ?? "");
    }
    return out;
  });
}

export function required(row: CsvRow, column: string, line: number): string {
  const v = row[column];
  if (!v) throw new Error(`Line ${line}: missing ${column}`);
  return v;
}

export function optional(row: CsvRow, column: string): string | undefined {
  const v = row[column];
  return v ? v : undefined;
}

export function namesFromRow(
  row: CsvRow,
  line: number,
): { firstName: string; lastName: string } {
  const full = optional(row, "fullName");
  if (full) {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  }
  return {
    firstName: required(row, "firstName", line),
    lastName: required(row, "lastName", line),
  };
}
