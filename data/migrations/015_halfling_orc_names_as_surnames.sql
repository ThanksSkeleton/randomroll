BEGIN;

INSERT INTO names (Name, Type, "Group", Source)
SELECT DISTINCT Name, 'Surname', "Group", Source
FROM names AS given_names
WHERE "Group" IN ('Halfling', 'Orc')
  AND Type IN ('Male', 'Female', 'Unisex')
  AND NOT EXISTS (
    SELECT 1
    FROM names AS existing_surname
    WHERE existing_surname.Name = given_names.Name
      AND existing_surname.Type = 'Surname'
      AND existing_surname."Group" = given_names."Group"
      AND existing_surname.Source = given_names.Source
  );

COMMIT;
