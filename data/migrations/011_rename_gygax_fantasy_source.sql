BEGIN;

UPDATE names
SET Source = 'GygaxFantasyNames'
WHERE "Group" = 'Fantasy'
  AND Source = 'FantasyNames';

COMMIT;
