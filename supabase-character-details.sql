ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS race text,
  ADD COLUMN IF NOT EXISTS "class" text,
  ADD COLUMN IF NOT EXISTS house text;

WITH legacy_tags AS (
  SELECT
    id,
    CASE jsonb_typeof(to_jsonb(tags))
      WHEN 'array' THEN (
        SELECT string_agg(tag.value, ' | ')
        FROM jsonb_array_elements_text(to_jsonb(characters.tags)) AS tag(value)
      )
      WHEN 'string' THEN to_jsonb(tags) #>> '{}'
      ELSE ''
    END AS tag_text
  FROM public.characters
),
legacy_details AS (
  SELECT
    legacy_tags.id,
    legacy_tags.tag_text,
    detail.part,
    detail.ordinality,
    row_number() OVER (PARTITION BY legacy_tags.id ORDER BY detail.ordinality) AS detail_position
  FROM legacy_tags
  CROSS JOIN LATERAL unnest(string_to_array(legacy_tags.tag_text, '|'))
    WITH ORDINALITY AS detail(part, ordinality)
  WHERE btrim(detail.part) <> ''
    AND btrim(detail.part) !~* '^(player\s*:|lvl\s*[:=-]?|level\s*[:=-]?|house\s*[:=-]?)'
    AND btrim(detail.part) !~* '^(phoenix|fox|selkie)$'
),
details_by_character AS (
  SELECT
    id,
    max(part) FILTER (WHERE detail_position = 1) AS race,
    max(part) FILTER (WHERE detail_position = 2) AS class
  FROM legacy_details
  GROUP BY id
)
UPDATE public.characters AS c
SET
  level = COALESCE(NULLIF(c.level, ''), NULLIF(btrim((regexp_match(
    legacy_tags.tag_text,
    '(?:^|[|])\s*(?:lvl|level)\s*[:=-]?\s*([^|]+)',
    'i'
  ))[1]), '')),
  race = COALESCE(NULLIF(c.race, ''), NULLIF(btrim(details_by_character.race), '')),
  "class" = COALESCE(NULLIF(c."class", ''), NULLIF(btrim(details_by_character.class), '')),
  house = COALESCE(
    NULLIF(c.house, ''),
    CASE lower((regexp_match(
      legacy_tags.tag_text,
      '(?:^|[|])\s*(?:house\s*[:=-]?\s*)?(phoenix|fox|selkie)\s*(?:[|]|$)',
      'i'
    ))[1])
      WHEN 'phoenix' THEN 'Phoenix'
      WHEN 'fox' THEN 'Fox'
      WHEN 'selkie' THEN 'Selkie'
      ELSE NULL
    END
  )
FROM legacy_tags
LEFT JOIN details_by_character ON details_by_character.id = legacy_tags.id
WHERE c.id = legacy_tags.id
  AND legacy_tags.tag_text <> '';
