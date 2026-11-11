BEGIN;

DELETE FROM names
WHERE length(Name) >= 12;

COMMIT;
