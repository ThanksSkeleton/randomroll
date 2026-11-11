BEGIN;

CREATE TEMP TABLE names_unisex_migration AS
SELECT "Group", Name, GROUP_CONCAT(DISTINCT Source) AS Source
FROM names
WHERE Type IN ('Male', 'Female')
GROUP BY "Group", Name
HAVING COUNT(DISTINCT Type) = 2;

DELETE FROM names
WHERE Type IN ('Male', 'Female')
  AND EXISTS (
    SELECT 1
    FROM names_unisex_migration AS unisex
    WHERE unisex."Group" = names."Group"
      AND unisex.Name = names.Name
  );

INSERT INTO names (Name, Type, "Group", Source)
SELECT unisex.Name, 'Unisex', unisex."Group", unisex.Source
FROM names_unisex_migration AS unisex;

DROP TABLE names_unisex_migration;

COMMIT;
