// scripts/data_ingester_builder.ts

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { parse } from "csv-parse/sync";

type Mode = "BULK" | "FULL" | "STRUCTURE";

type TableSchema = {
  tableName: string;
  columns: string[];
};

type ParsedCsv = TableSchema & {
  rows: string[][];
};

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

  // New default mode:
  // npx tsx script.ts <csv-folder> <data-folder> <db-path>
  if (args.length === 3 && !looksLikeMode(args[0])) {
    runBulkMode(args);
    return;
  }

  if (args.length < 1) {
    printUsageAndExit();
  }

  const mode = normalizeMode(args[0]);

  switch (mode) {
    case "BULK":
      runBulkMode(args.slice(1));
      return;

    case "FULL":
      runFullMode(args);
      return;

    case "STRUCTURE":
      runStructureMode(args);
      return;

    default:
      assertNever(mode);
  }
}

function runBulkMode(args: string[]): void {
  if (args.length !== 3) {
    printUsageAndExit();
  }

  const [sourceCsvFolder, destinationDataFolder, destinationDbPath] = args;

  if (!fs.existsSync(sourceCsvFolder)) {
    throw new Error(`Source CSV folder does not exist: ${sourceCsvFolder}`);
  }

  if (!fs.statSync(sourceCsvFolder).isDirectory()) {
    throw new Error(`Source CSV path is not a folder: ${sourceCsvFolder}`);
  }

  fs.mkdirSync(destinationDataFolder, { recursive: true });
  fs.mkdirSync(path.dirname(destinationDbPath), { recursive: true });

  const csvFiles = fs
    .readdirSync(sourceCsvFolder, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((filename) => filename.toLowerCase().endsWith(".csv"))
    .sort();

  let created = 0;
  let skipped = 0;

  for (const csvFilename of csvFiles) {
    const sourceCsvPath = path.join(sourceCsvFolder, csvFilename);
    const tableName = path.basename(csvFilename, path.extname(csvFilename)).trim();

    assertValidIdentifier("table name derived from CSV filename", tableName);

    if (sqliteTableExists(destinationDbPath, tableName)) {
      console.log(`SKIP existing table: ${tableName}`);
      skipped++;
      continue;
    }

    const parsed = readAndValidateCsv(sourceCsvPath);
    const generatedTsPath = path.join(destinationDataFolder, `${parsed.tableName}.ts`);

    ensureOutputTsFileDoesNotExist(generatedTsPath);

    createSqliteTable(destinationDbPath, parsed);
    writeTypeScriptDataFile(generatedTsPath, parsed);

    console.log(`CREATE table: ${parsed.tableName} (${parsed.rows.length} rows)`);
    created++;
  }

  console.log("");
  console.log(`CSV files found: ${csvFiles.length}`);
  console.log(`Tables created: ${created}`);
  console.log(`Tables skipped: ${skipped}`);
}

function runFullMode(args: string[]): void {
  if (args.length !== 4) {
    printUsageAndExit();
  }

  const [, sourceCsvPath, destinationDataFolder, destinationDbPath] = args;

  const parsed = readAndValidateCsv(sourceCsvPath);
  const generatedTsPath = path.join(destinationDataFolder, `${parsed.tableName}.ts`);

  ensureOutputTsFileDoesNotExist(generatedTsPath);

  fs.mkdirSync(destinationDataFolder, { recursive: true });
  fs.mkdirSync(path.dirname(destinationDbPath), { recursive: true });

  createSqliteTable(destinationDbPath, parsed);
  writeTypeScriptDataFile(generatedTsPath, parsed);

  console.log(`Created SQLite table: ${parsed.tableName}`);
  console.log(`Inserted rows: ${parsed.rows.length}`);
  console.log(`Created TypeScript file: ${generatedTsPath}`);
}

function runStructureMode(args: string[]): void {
  if (args.length !== 4) {
    printUsageAndExit();
  }

  const [, sqliteDbPath, tableNameRaw, destinationDataFolder] = args;

  const tableName = tableNameRaw.trim();
  assertValidIdentifier("table name", tableName);

  const schema = readAndValidateSqliteTableSchema(sqliteDbPath, tableName);
  const generatedTsPath = path.join(destinationDataFolder, `${schema.tableName}.ts`);

  ensureOutputTsFileDoesNotExist(generatedTsPath);

  fs.mkdirSync(destinationDataFolder, { recursive: true });

  writeTypeScriptDataFile(generatedTsPath, schema);

  console.log(`Read SQLite table: ${schema.tableName}`);
  console.log(`Validated columns: ${schema.columns.length}`);
  console.log(`Created TypeScript file: ${generatedTsPath}`);
}

function normalizeMode(modeRaw: string): Mode {
  const mode = modeRaw.trim().toUpperCase();

  if (mode === "BULK" || mode === "DEFAULT") {
    return "BULK";
  }

  if (mode === "FULL") {
    return "FULL";
  }

  if (mode === "STRUCTURE" || mode === "SCHEMA" || mode === "MODE2") {
    return "STRUCTURE";
  }

  throw new Error(
    `Unsupported mode: ${modeRaw}. Supported modes: BULK, FULL, STRUCTURE.`
  );
}

function looksLikeMode(value: string): boolean {
  const normalized = value.trim().toUpperCase();

  return [
    "BULK",
    "DEFAULT",
    "FULL",
    "STRUCTURE",
    "SCHEMA",
    "MODE2",
  ].includes(normalized);
}

function readAndValidateCsv(sourceCsvPath: string): ParsedCsv {
  if (!fs.existsSync(sourceCsvPath)) {
    throw new Error(`Source CSV does not exist: ${sourceCsvPath}`);
  }

  const tableName = path.basename(sourceCsvPath, path.extname(sourceCsvPath)).trim();
  assertValidIdentifier("table name derived from CSV filename", tableName);

  const csvText = fs.readFileSync(sourceCsvPath, "utf8");

  const parsedRows = parse(csvText, {
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as string[][];

  if (parsedRows.length === 0) {
    throw new Error(`CSV is empty: ${sourceCsvPath}`);
  }

  const columns = parsedRows[0].map((column) => column.trim());

  validateColumnNames(columns);

  const rows = parsedRows.slice(1).map((row, rowIndex) => {
    if (row.length !== columns.length) {
      throw new Error(
        `Row ${rowIndex + 2} has ${row.length} values, expected ${columns.length}.`
      );
    }

    return row.map((value) => String(value).trim());
  });

  return {
    tableName,
    columns,
    rows,
  };
}

function readAndValidateSqliteTableSchema(
  sqliteDbPath: string,
  requestedTableName: string
): TableSchema {
  if (!fs.existsSync(sqliteDbPath)) {
    throw new Error(`SQLite database does not exist: ${sqliteDbPath}`);
  }

  const db = new Database(sqliteDbPath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    const existingTable = findSqliteTable(db, requestedTableName);

    if (!existingTable) {
      throw new Error(
        `SQLite table does not exist: ${requestedTableName} in ${sqliteDbPath}`
      );
    }

    const actualTableName = existingTable.name;
    assertValidIdentifier("table name from SQLite", actualTableName);

    const tableInfoRows = db
      .prepare(`PRAGMA table_info(${quoteSqlIdentifier(actualTableName)})`)
      .all() as SqliteTableInfoRow[];

    if (tableInfoRows.length === 0) {
      throw new Error(
        `SQLite table has no columns or could not be inspected: ${actualTableName}`
      );
    }

    const columns = tableInfoRows.map((row) => row.name.trim());

    validateColumnNames(columns);

    return {
      tableName: actualTableName,
      columns,
    };
  } finally {
    db.close();
  }
}

function sqliteTableExists(sqliteDbPath: string, tableName: string): boolean {
  if (!fs.existsSync(sqliteDbPath)) {
    return false;
  }

  const db = new Database(sqliteDbPath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    return findSqliteTable(db, tableName) !== undefined;
  } finally {
    db.close();
  }
}

function findSqliteTable(
  db: Database.Database,
  tableName: string
): { name: string } | undefined {
  return db
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND lower(name) = lower(?)
      LIMIT 1
      `
    )
    .get(tableName) as { name: string } | undefined;
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

function createSqliteTable(destinationDbPath: string, parsed: ParsedCsv): void {
  const db = new Database(destinationDbPath);

  try {
    const existingTable = findSqliteTable(db, parsed.tableName);

    if (existingTable) {
      throw new Error(
        `SQLite table already exists: ${existingTable.name} in ${destinationDbPath}`
      );
    }

    const columnDefinitions = parsed.columns
      .map((column) => `${quoteSqlIdentifier(column)} TEXT NOT NULL`)
      .join(",\n  ");

    const createTableSql = `
      CREATE TABLE ${quoteSqlIdentifier(parsed.tableName)} (
        ${columnDefinitions}
      )
    `;

    const quotedColumns = parsed.columns.map(quoteSqlIdentifier).join(", ");
    const placeholders = parsed.columns.map(() => "?").join(", ");

    const insertSql = `
      INSERT INTO ${quoteSqlIdentifier(parsed.tableName)} (${quotedColumns})
      VALUES (${placeholders})
    `;

    const transaction = db.transaction(() => {
      db.prepare(createTableSql).run();

      const insert = db.prepare(insertSql);

      for (const row of parsed.rows) {
        insert.run(...row);
      }
    });

    transaction();
  } finally {
    db.close();
  }
}

function writeTypeScriptDataFile(
  generatedTsPath: string,
  schema: TableSchema
): void {
  const pascalName = toPascalCase(schema.tableName);
  const typeName = `${pascalName}Row`;
  const columnTypeName = `${pascalName}Column`;
  const constantPrefix = toScreamingSnakeCase(schema.tableName);

  const columnLines = schema.columns
    .map((column) => `  "${column}",`)
    .join("\n");

  const typeLines = schema.columns
    .map((column) => `  ${column}: string;`)
    .join("\n");

  const fileContents = `// AUTO-GENERATED by data_ingester_builder.ts
// Source table: ${schema.tableName}

export const ${constantPrefix}_TABLE_NAME = "${schema.tableName}" as const;

export const ${constantPrefix}_COLUMNS = [
${columnLines}
] as const;

export type ${columnTypeName} = typeof ${constantPrefix}_COLUMNS[number];

export type ${typeName} = {
${typeLines}
};
`;

  fs.writeFileSync(generatedTsPath, fileContents, {
    encoding: "utf8",
    flag: "wx",
  });
}

function ensureOutputTsFileDoesNotExist(generatedTsPath: string): void {
  if (fs.existsSync(generatedTsPath)) {
    throw new Error(`Generated TypeScript file already exists: ${generatedTsPath}`);
  }
}

function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function toPascalCase(identifier: string): string {
  const result = identifier
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  if (result.length === 0) {
    throw new Error(`Could not derive PascalCase name from identifier: ${identifier}`);
  }

  return result;
}

function toScreamingSnakeCase(identifier: string): string {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

function printUsageAndExit(): never {
  console.error(`
Usage:

  DEFAULT BULK mode:
    npx tsx scripts/data_ingester_builder.ts <source-csv-folder> <destination-data-folder> <destination-sqlite-db-path>

  Explicit BULK mode:
    npx tsx scripts/data_ingester_builder.ts BULK <source-csv-folder> <destination-data-folder> <destination-sqlite-db-path>

  FULL mode:
    npx tsx scripts/data_ingester_builder.ts FULL <source-csv-path> <destination-data-folder> <destination-sqlite-db-path>

  STRUCTURE mode:
    npx tsx scripts/data_ingester_builder.ts STRUCTURE <sqlite-db-path> <table-name> <destination-data-folder>

Examples:

  npx tsx scripts/data_ingester_builder.ts ./csv ./src/data ./randomroll.sqlite

  npx tsx scripts/data_ingester_builder.ts BULK ./csv ./src/data ./randomroll.sqlite

  npx tsx scripts/data_ingester_builder.ts FULL ./Pokemon.csv ./src/data ./randomroll.sqlite

  npx tsx scripts/data_ingester_builder.ts STRUCTURE ./randomroll.sqlite Pokemon ./src/data
`);
  process.exit(1);
}

main();