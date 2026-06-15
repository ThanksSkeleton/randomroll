import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { MultiColumnTable } from "../src/framework";

type SQLiteValue = string | number | bigint | Buffer | null;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function ensureParentDirectoryExists(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function getColumns(db: Database.Database, tableName: string): string[] {
  const rows = db
    .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)});`)
    .all() as { name: string }[];

  if (rows.length === 0) {
    throw new Error(`Table does not exist or has no columns: ${tableName}`);
  }

  return rows.map((row) => row.name);
}

function sqliteValueToString(value: SQLiteValue): string {
  if (value === null) {
    return "";
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }

  return String(value);
}

function dumpSqliteTable(
  dbPath: string,
  tableName: string,
  outputPath: string,
  label?: string
): void {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite database file does not exist: ${dbPath}`);
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    const columns = getColumns(db, tableName);
    const columnSql = columns.map(quoteIdentifier).join(", ");

    const records = db
      .prepare(`SELECT ${columnSql} FROM ${quoteIdentifier(tableName)};`)
      .all() as Record<string, SQLiteValue>[];

    const output: MultiColumnTable = {
      version: "1.0.0",
      name: tableName,
      ...(label ? { label } : {}),
      table: {
        columns,
        rows: records.map((record) =>
          columns.map((column) => sqliteValueToString(record[column]))
        ),
      },
    };

    ensureParentDirectoryExists(outputPath);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  } finally {
    db.close();
  }
}

function main(): void {
  const [, , dbPath, tableName, outputPath, label] = process.argv;

  if (!dbPath || !tableName || !outputPath) {
    console.error(
      [
        "Usage:",
        "  tsx scripts/dump-sqlite-table.ts <sqlite-db-path> <table-name> <output-json-path>",
        "",
        "Example:",
        "  tsx scripts/dump-sqlite-table.ts data/randomroll.sqlite powers src/data/generated/powers.json",
      ].join("\n")
    );

    process.exit(1);
  }

  dumpSqliteTable(dbPath, tableName, outputPath);
}

main();