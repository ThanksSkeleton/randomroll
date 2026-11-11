BEGIN;

UPDATE names
SET Type = 'Female'
WHERE "Group" = 'US'
  AND Type = 'Unisex'
  AND Name IN ('Leslie', 'Lynn', 'Shannon', 'Stacey', 'Stacy', 'Tracey', 'Tracy');

UPDATE names
SET Type = 'Male'
WHERE "Group" = 'US'
  AND Type = 'Unisex'
  AND Name IN ('Michael', 'Terry');

COMMIT;
