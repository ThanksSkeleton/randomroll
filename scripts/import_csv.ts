import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { parse } from "csv-parse/sync";

type NameRow = {
  Name: string;
  Type: string;
  Group: string;
  Source: string;
};

function usage(): never {
  console.error("Usage: npx tsx load-names-csvs.ts <db-path> <csv-folder-path>");
  process.exit(1);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function getCsvFiles(folderPath: string): string[] {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }

  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a folder: ${folderPath}`);
  }

  return fs
    .readdirSync(folderPath)
    .filter((file) => file.toLowerCase().endsWith(".csv"))
    .map((file) => path.join(folderPath, file));
}

function parseCsvFile(filePath: string): NameRow[] {
  const raw = fs.readFileSync(filePath, "utf8");

  const records = parse(raw, {
    columns: (headers: string[]) => {
      const normalized = headers.map(normalizeHeader);

      const expected = ["name", "type", "group", "source"];
      const missing = expected.filter((h) => !normalized.includes(h));

      if (missing.length > 0) {
        throw new Error(
          `CSV ${filePath} is missing required columns: ${missing.join(", ")}`
        );
      }

      return headers.map((h) => h.trim());
    },
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((r) => ({
    Name: r.Name ?? r.name ?? "",
    Type: r.Type ?? r.type ?? "",
    Group: r.Group ?? r.group ?? "",
    Source: r.Source ?? r.source ?? "",
  }));
}

function main(): void {
  const [, , dbPath, folderPath] = process.argv;

  if (!dbPath || !folderPath) {
    usage();
  }

  const csvFiles = getCsvFiles(folderPath);

  if (csvFiles.length === 0) {
    throw new Error(`No .csv files found in folder: ${folderPath}`);
  }

  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS names (
      Name   TEXT NOT NULL,
      Type   TEXT NOT NULL,
      "Group" TEXT NOT NULL,
      Source TEXT NOT NULL
    );
  `);

  const insert = db.prepare(`
    INSERT INTO names (Name, Type, "Group", Source)
    VALUES (@Name, @Type, @Group, @Source);
  `);

  const insertMany = db.transaction((rows: NameRow[]) => {
    for (const row of rows) {
      insert.run(row);
    }
  });

  let totalInserted = 0;

  for (const file of csvFiles) {
    const rows = parseCsvFile(file);
    insertMany(rows);
    totalInserted += rows.length;

    console.log(`Loaded ${rows.length} rows from ${path.basename(file)}`);
  }

  console.log(`Done. Loaded ${totalInserted} total rows into ${dbPath} -> names`);
}

main();