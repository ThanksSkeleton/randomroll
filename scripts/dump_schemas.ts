// dump-schemas.ts
import Database from 'better-sqlite3';

const dbPath = process.argv[2];

if (!dbPath) {
  console.error('Usage: tsx dump-schemas.ts <path-to-db.sqlite>');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

const rows = db
  .prepare(
    `
    SELECT 
      type,
      name,
      tbl_name,
      sql
    FROM sqlite_master
    WHERE sql IS NOT NULL
      AND type IN ('table', 'index', 'view', 'trigger')
    ORDER BY 
      CASE type
        WHEN 'table' THEN 1
        WHEN 'view' THEN 2
        WHEN 'index' THEN 3
        WHEN 'trigger' THEN 4
        ELSE 5
      END,
      name
  `,
  )
  .all() as Array<{
  type: string;
  name: string;
  tbl_name: string;
  sql: string;
}>;

for (const row of rows) {
  console.log(`-- ${row.type.toUpperCase()}: ${row.name}`);
  console.log(row.sql.trim() + ';');
  console.log();
}

db.close();
