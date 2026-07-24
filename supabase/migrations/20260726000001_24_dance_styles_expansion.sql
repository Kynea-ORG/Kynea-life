-- 24. DANCE_STYLES — nuevas categorías + rename Breakdance -> Breaking
-- Amplía las opciones de estilo de baile disponibles al crear una clase.

UPDATE public.dance_styles
  SET name = 'Breaking', slug = 'breaking'
  WHERE slug = 'breakdance';

INSERT INTO public.dance_styles (name, slug, emoji, ord) VALUES
  ('Sexy Dance',          'sexy-dance',          '💋', 25),
  ('Street Jazz',         'street-jazz',         '🕺', 26),
  ('Experimental',        'experimental',        '🧪', 27),
  ('Flamenco',            'flamenco',            '🌹', 28),
  ('Bollywood',           'bollywood',           '🎬', 29),
  ('Bhangra',             'bhangra',             '🎶', 30),
  ('Danzas árabes',       'danzas-arabes',       '✨', 31),
  ('Merengue',            'merengue',            '🎉', 32),
  ('Swing',               'swing',               '🎼', 33),
  ('Mambo',               'mambo',               '🎺', 34),
  ('Rock and Roll',       'rock-and-roll',       '🎸', 35),
  ('Tap',                 'tap',                 '👞', 36),
  ('Locking',             'locking',             '🔒', 37),
  ('Krump',               'krump',               '💥', 38),
  ('Popping',             'popping',             '🤖', 39),
  ('Waacking',            'waacking',            '🙌', 40),
  ('Kizomba',             'kizomba',             '💫', 41),
  ('Axé',                 'axe',                 '🌴', 42),
  ('Afrohouse',           'afrohouse',           '🌍', 43),
  ('Lambada',             'lambada',             '🌺', 44),
  ('Country',             'country',             '🤠', 45),
  ('Charleston',          'charleston',          '🎩', 46),
  ('Vals',                'vals',                '👑', 47),
  ('Caporales',           'caporales',           '🎊', 48),
  ('Morenada',            'morenada',            '🎐', 49),
  ('Danzas folclóricas',  'danzas-folkloricas',  '🌈', 50)
ON CONFLICT (slug) DO NOTHING;
