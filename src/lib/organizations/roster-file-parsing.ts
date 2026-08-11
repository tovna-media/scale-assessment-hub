// Client-side CSV/Excel roster parsing for org signup's file-upload entry
// method. Excel parsing uses `read-excel-file` rather than the more common
// `xlsx` (SheetJS) package -- the npm build of `xlsx` has unpatched
// prototype-pollution/ReDoS advisories (SheetJS moved patched releases off
// npm), so it's avoided here even though the file is the org's own upload.

export interface RosterRow {
  fullName: string;
  email: string;
}

export interface RosterParseResult {
  rows: RosterRow[];
  errors: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  return String(cell).trim();
}

function extractRosterRows(matrix: unknown[][]): RosterParseResult {
  const rows: RosterRow[] = [];
  const errors: string[] = [];

  const nonEmptyRows = matrix.filter((row) => row.some((cell) => cellToString(cell) !== ""));
  if (nonEmptyRows.length === 0) {
    return { rows, errors: ["The file doesn't contain any rows."] };
  }

  const firstRow = nonEmptyRows[0].map((cell) => cellToString(cell).toLowerCase());
  const nameColFromHeader = firstRow.findIndex((cell) => cell.includes("name"));
  const emailColFromHeader = firstRow.findIndex((cell) => cell.includes("email"));
  const hasHeader = nameColFromHeader !== -1 && emailColFromHeader !== -1;

  const nameCol = hasHeader ? nameColFromHeader : 0;
  const emailCol = hasHeader ? emailColFromHeader : 1;
  const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;

  dataRows.forEach((row, index) => {
    const rowNumber = index + (hasHeader ? 2 : 1);
    const fullName = cellToString(row[nameCol]);
    const email = cellToString(row[emailCol]).toLowerCase();

    if (!fullName || !email) {
      errors.push(`Row ${rowNumber}: missing a name or email, skipped.`);
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      errors.push(`Row ${rowNumber}: "${email}" doesn't look like a valid email, skipped.`);
      return;
    }
    rows.push({ fullName, email });
  });

  return { rows, errors };
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // handled by the following \n
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export async function parseRosterFile(file: File): Promise<RosterParseResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const text = await file.text();
    return extractRosterRows(parseCsvText(text));
  }

  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    const matrix = await readSheet(file);
    return extractRosterRows(matrix);
  }

  return {
    rows: [],
    errors: ["Please upload a .csv or .xlsx file."],
  };
}
