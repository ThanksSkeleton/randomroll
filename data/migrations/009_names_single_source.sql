BEGIN;

WITH RECURSIVE source_parts(name_id, remaining, source) AS (
  SELECT rowid, Source || ',', ''
  FROM names
  WHERE instr(Source, ',') > 0

  UNION ALL

  SELECT
    name_id,
    substr(remaining, instr(remaining, ',') + 1),
    trim(substr(remaining, 1, instr(remaining, ',') - 1))
  FROM source_parts
  WHERE remaining <> ''
)
UPDATE names
SET Source = (
  SELECT MIN(source)
  FROM source_parts
  WHERE source_parts.name_id = names.rowid
    AND source <> ''
)
WHERE instr(Source, ',') > 0;

COMMIT;
