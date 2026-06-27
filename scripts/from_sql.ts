// scripts/dump_sqlite_table_to_object_json.ts

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type JsonPrimitive = string;
type StrongNamedRow = Record<string, JsonPrimitive>;

type SqliteTableInfoRow = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

function main(): void {
  const args = process.argv.slice(2);

  if (args.length !== 3) {
    printUsageAndExit();
  }

  const [sqliteDbPath, tableNameRaw, outFolder] = args;

  const tableName = tableNameRaw.trim();
  assertValidIdentifier("table name", tableName);

  if (!fs.existsSync(sqliteDbPath)) {
    throw new Error(`SQLite database does not exist: ${sqliteDbPath}`);
  }

  fs.mkdirSync(outFolder, { recursive: true });

  const outPath = path.join(outFolder, `${tableName}.json`);

  const rows = dumpTableToStrongNamedObjects(sqliteDbPath, tableName);

  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), {
    encoding: "utf8",
    flag: "w",
  });

  console.log(`Dumped table: ${tableName}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Created JSON file: ${outPath}`);
}

function dumpTableToStrongNamedObjects(
  sqliteDbPath: string,
  requestedTableName: string
): StrongNamedRow[] {
  const db = new Database(sqliteDbPath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    const existingTable = db
      .prepare(
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND lower(name) = lower(?)
        LIMIT 1
        `
      )
      .get(requestedTableName) as { name: string } | undefined;

    if (!existingTable) {
      throw new Error(
        `SQLite table does not exist: ${requestedTableName} in ${sqliteDbPath}`
      );
    }

    const actualTableName = existingTable.name;
    assertValidIdentifier("table name from SQLite", actualTableName);

    const columns = readAndValidateColumns(db, actualTableName);

    const sql = `
      SELECT ${columns.map(quoteSqlIdentifier).join(", ")}
      FROM ${quoteSqlIdentifier(actualTableName)}
    `;

    const rawRows = db.prepare(sql).all() as Record<string, unknown>[];

    return rawRows.map((rawRow, rowIndex) => {
      const outRow: StrongNamedRow = {};

      for (const column of columns) {
        const value = rawRow[column];

        if (value === null || value === undefined) {
          outRow[column] = "";
          continue;
        }

        if (
          typeof value !== "string" &&
          typeof value !== "number" &&
          typeof value !== "boolean" &&
          typeof value !== "bigint"
        ) {
          throw new Error(
            `Unsupported value in row ${rowIndex + 1}, column "${column}": ${String(value)}`
          );
        }

        outRow[column] = String(value);
      }

      return outRow;
    });
  } finally {
    db.close();
  }
}

function readAndValidateColumns(
  db: Database.Database,
  tableName: string
): string[] {
  const tableInfoRows = db
    .prepare(`PRAGMA table_info(${quoteSqlIdentifier(tableName)})`)
    .all() as SqliteTableInfoRow[];

  if (tableInfoRows.length === 0) {
    throw new Error(`SQLite table has no columns: ${tableName}`);
  }

  const columns = tableInfoRows.map((row) => row.name.trim());

  validateColumnNames(columns);

  return columns;
}

function validateColumnNames(columns: string[]): void {
  if (columns.length === 0) {
    throw new Error("Table has no columns.");
  }

  for (const column of columns) {
    assertValidIdentifier("column name", column);
  }

  assertNoDuplicateColumns(columns);
}

function assertValidIdentifier(label: string, value: string): void {
  if (!IDENTIFIER_REGEX.test(value)) {
    throw new Error(
      `Invalid ${label}: "${value}". ` +
        "Names must start with a letter or underscore and contain only letters, numbers, and underscores."
    );
  }
}

function assertNoDuplicateColumns(columns: string[]): void {
  const seen = new Set<string>();

  for (const column of columns) {
    const normalized = column.toLowerCase();

    if (seen.has(normalized)) {
      throw new Error(
        `Duplicate column name after case-normalization: "${column}". SQLite identifiers are case-insensitive.`
      );
    }

    seen.add(normalized);
  }
}

function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function printUsageAndExit(): never {
  console.error(`
Usage:

  npx tsx scripts/from_sql.ts <sqlite-db-path> <table-name> <out-folder>

Example:

  npx tsx scripts/from_sql.ts ./randomroll.sqlite Pokemon ./src/generated-data
`);
  process.exit(1);
}

main();