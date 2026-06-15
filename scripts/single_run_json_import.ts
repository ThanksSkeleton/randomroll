import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

type SingletonTable = {
  version: string;
  name: string;
  label?: string;
  table: {
    entries: string[];
  };
};

type MultiColumnTable = {
  version: string;
  name: string;
  label?: string;
  table: {
    columns: string[];
    rows: string[][];
  };
};

type JsonTable = SingletonTable | MultiColumnTable;

type LoadSpec = {
  jsonPath: string;
  tableName: string;
};

function isSingletonTable(value: JsonTable): value is SingletonTable {
  return "entries" in value.table;
}

function isMultiColumnTable(value: JsonTable): value is MultiColumnTable {
  return "columns" in value.table && "rows" in value.table;
}

function quoteIdentifier(identifier: string): string {
  // SQLite identifiers are quoted with double quotes.
  // Embedded quotes must be escaped by doubling them.
  return `"${identifier.replaceAll(`"`, `""`)}"`;
}

function readJsonTable(jsonPath: string): JsonTable {
  const raw = fs.readFileSync(jsonPath, "utf8");
  return JSON.parse(raw) as JsonTable;
}

function loadSingletonTable(
  db: Database.Database,
  tableName: string,
  json: SingletonTable,
  clearFirst: boolean,
): void {
  const quotedTable = quoteIdentifier(tableName);

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ${quotedTable} (
      entry TEXT NOT NULL
    )
  `).run();

  if (clearFirst) {
    db.prepare(`DELETE FROM ${quotedTable}`).run();
  }

  const insert = db.prepare(`
    INSERT INTO ${quotedTable} (entry)
    VALUES (?)
  `);

  const insertAll = db.transaction((entries: string[]) => {
    for (const entry of entries) {
      insert.run(String(entry));
    }
  });

  insertAll(json.table.entries);
}

function loadMultiColumnTable(
  db: Database.Database,
  tableName: string,
  json: MultiColumnTable,
  clearFirst: boolean,
): void {
  const quotedTable = quoteIdentifier(tableName);

  const columns = json.table.columns;

  if (columns.length === 0) {
    throw new Error(`Cannot load ${tableName}: table.columns is empty.`);
  }

  for (const row of json.table.rows) {
    if (row.length !== columns.length) {
      throw new Error(
        `Cannot load ${tableName}: row has ${row.length} values, but expected ${columns.length}. Row: ${JSON.stringify(row)}`,
      );
    }
  }

  const columnDefs = columns
    .map((column) => `${quoteIdentifier(column)} TEXT NOT NULL`)
    .join(", ");

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ${quotedTable} (
      ${columnDefs}
    )
  `).run();

  if (clearFirst) {
    db.prepare(`DELETE FROM ${quotedTable}`).run();
  }

  const quotedColumns = columns.map(quoteIdentifier).join(", ");
  const placeholders = columns.map(() => "?").join(", ");

  const insert = db.prepare(`
    INSERT INTO ${quotedTable} (${quotedColumns})
    VALUES (${placeholders})
  `);

  const insertAll = db.transaction((rows: string[][]) => {
    for (const row of rows) {
      insert.run(...row.map(String));
    }
  });

  insertAll(json.table.rows);
}

function loadJsonTable(
  db: Database.Database,
  spec: LoadSpec,
  clearFirst: boolean,
): void {
  const json = readJsonTable(spec.jsonPath);

  if (isSingletonTable(json)) {
    loadSingletonTable(db, spec.tableName, json, clearFirst);
    console.log(`Loaded singleton table: ${spec.jsonPath} -> ${spec.tableName}`);
    return;
  }

  if (isMultiColumnTable(json)) {
    loadMultiColumnTable(db, spec.tableName, json, clearFirst);
    console.log(`Loaded multi-column table: ${spec.jsonPath} -> ${spec.tableName}`);
    return;
  }

  throw new Error(`Unrecognized table shape: ${spec.jsonPath}`);
}

function main(): void {
  const args = process.argv.slice(2);

  const dbPath = args[0];
  const jsonRoot = args[1] ?? ".";

  if (!dbPath) {
    console.error("Usage:");
    console.error("  npx tsx scripts/load-json-tables.ts <sqlite-db-path> [json-root]");
    process.exit(1);
  }

  const specs: LoadSpec[] = [
    {
      jsonPath: path.join(jsonRoot, "IATW_Powers.json"),
      tableName: "powers",
    },
    {
      jsonPath: path.join(jsonRoot, "JP_male_first_names.json"),
      tableName: "jp_male",
    },
    {
      jsonPath: path.join(jsonRoot, "Sol_Planets.json"),
      tableName: "planets",
    },
  ];

  const db = new Database(dbPath);

  // Good default for build/import scripts.
  db.pragma("journal_mode = WAL");

  const clearFirst = true;

  try {
    const loadAll = db.transaction(() => {
      for (const spec of specs) {
        loadJsonTable(db, spec, clearFirst);
      }
    });

    loadAll();

    console.log(`Done. SQLite DB written to: ${dbPath}`);
  } finally {
    db.close();
  }
}

main();