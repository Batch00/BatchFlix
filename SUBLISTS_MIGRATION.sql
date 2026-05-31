-- Run TASK 1 SQL first (schema changes):
ALTER TABLE batchflix.lists ADD COLUMN IF NOT EXISTS parent_list_id uuid REFERENCES batchflix.lists(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS lists_parent_list_id_idx ON batchflix.lists(parent_list_id);

-- Run TASK 6 SQL after deploying (franchise sublists migration):
DO $$
DECLARE
  movie_series_id uuid;
  new_list_id uuid;
BEGIN
  SELECT id INTO movie_series_id FROM batchflix.lists
  WHERE name = 'Movie Series to Watch' AND user_id = '1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc';
  IF movie_series_id IS NULL THEN RAISE NOTICE 'Movie Series to Watch not found'; RETURN; END IF;

  -- Terminator
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Terminator','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id AND (mi.title ILIKE 'Terminator%' OR mi.title='Terminator: Dark Fate');
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items WHERE title ILIKE 'Terminator%' OR title='Terminator: Dark Fate');

  -- Jurassic Park
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Jurassic Park','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id AND mi.title ILIKE 'Jurassic%';
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items WHERE title ILIKE 'Jurassic%');

  -- Die Hard
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Die Hard','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id
  AND (mi.title ILIKE 'Die Hard%' OR mi.title='A Good Day to Die Hard' OR mi.title='Live Free or Die Hard');
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items
  WHERE title ILIKE 'Die Hard%' OR title='A Good Day to Die Hard' OR title='Live Free or Die Hard');

  -- Godzilla/Kong
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Godzilla/Kong','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id AND (mi.title ILIKE 'Godzilla%' OR mi.title ILIKE 'Kong%');
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items WHERE title ILIKE 'Godzilla%' OR title ILIKE 'Kong%');

  -- Planet of the Apes
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Planet of the Apes','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id AND (mi.title ILIKE '%Planet of the Apes%' OR mi.title ILIKE '%Apes%');
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items
  WHERE title ILIKE '%Planet of the Apes%' OR title ILIKE '%Apes%');

  -- Cornetto Trilogy
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Cornetto Trilogy','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id
  AND mi.title IN('Shaun of the Dead','Hot Fuzz','The World''s End');
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items
  WHERE title IN('Shaun of the Dead','Hot Fuzz','The World''s End'));

  -- Dollars Trilogy
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Dollars Trilogy','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id AND mi.title IN('A Fistful of Dollars','For a Few Dollars More');
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items
  WHERE title IN('A Fistful of Dollars','For a Few Dollars More'));

  -- Alien
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Alien','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id
  AND mi.title IN('Alien','Aliens','Alien 3','Alien: Resurrection','Prometheus','Alien: Covenant','Alien: Romulus');
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items
  WHERE title IN('Alien','Aliens','Alien 3','Alien: Resurrection','Prometheus','Alien: Covenant','Alien: Romulus'));

  -- Space Jam
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Space Jam','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id AND mi.title ILIKE 'Space Jam%';
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items WHERE title ILIKE 'Space Jam%');

  -- Blade Runner
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Blade Runner','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id AND mi.title ILIKE 'Blade Runner%';
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items WHERE title ILIKE 'Blade Runner%');

  -- Halloween
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Halloween','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id
  AND mi.title IN('Halloween','Halloween II','Halloween Kills','Halloween Ends');
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items
  WHERE title IN('Halloween','Halloween II','Halloween Kills','Halloween Ends'));

  -- Friday the 13th
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Friday the 13th','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id AND mi.title ILIKE 'Friday the 13th%';
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items WHERE title ILIKE 'Friday the 13th%');

  -- Bourne
  INSERT INTO batchflix.lists (user_id,name,color,is_pinned,parent_list_id,rules)
  VALUES ('1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc','Bourne','#2563EB',false,movie_series_id,'[]')
  RETURNING id INTO new_list_id;
  INSERT INTO batchflix.list_items(list_id,media_id,position)
  SELECT new_list_id,li.media_id,ROW_NUMBER()OVER()-1
  FROM batchflix.list_items li JOIN batchflix.media_items mi ON mi.id=li.media_id
  WHERE li.list_id=movie_series_id
  AND mi.title IN('The Bourne Identity','The Bourne Supremacy','The Bourne Ultimatum','The Bourne Legacy','Jason Bourne');
  DELETE FROM batchflix.list_items WHERE list_id=movie_series_id
  AND media_id IN(SELECT id FROM batchflix.media_items
  WHERE title IN('The Bourne Identity','The Bourne Supremacy','The Bourne Ultimatum','The Bourne Legacy','Jason Bourne'));

  -- DC Universe -> sublist of Movie Series to Watch
  UPDATE batchflix.lists SET parent_list_id=movie_series_id
  WHERE name='DC Universe' AND user_id='1ca08f60-c0eb-4fae-8297-1a2c73fb9cfc';

  RAISE NOTICE 'Franchise migration complete';
END;
$$;
