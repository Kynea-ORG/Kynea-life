-- ── 56. SEED PUBLISHED BLOG POSTS ──────────────────────────────────────────
-- Inserta los 3 artículos editoriales iniciales en public.blog_posts.
-- Es idempotente (ON CONFLICT (slug) DO UPDATE) para ejecutarse de forma segura
-- en producción (kynea-prod) sin fallar ni duplicar registros.

DO $$
DECLARE
  v_author_id uuid;
BEGIN
  -- Asociar al autor correspondiente si existe en auth.users
  SELECT id INTO v_author_id
  FROM auth.users
  WHERE email IN ('davidvilcao@gmail.com', 'j.armando0807@gmail.com')
  ORDER BY CASE WHEN email = 'davidvilcao@gmail.com' THEN 1 ELSE 2 END
  LIMIT 1;

  -- Fallback: primer perfil admin disponible
  IF v_author_id IS NULL THEN
    SELECT id INTO v_author_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  END IF;

  -- 1. Los 5 estilos de baile que están marcando Latinoamérica
  INSERT INTO public.blog_posts (
    id,
    slug,
    title,
    excerpt,
    content,
    cover_image,
    category,
    accent_color,
    is_featured,
    status,
    published_at,
    author_id,
    meta_title,
    meta_description
  ) VALUES (
    'e44afa47-6eee-4558-abde-0e4a1d60184f',
    'los-5-estilos-de-baile-que-estan-marcando-latinoamerica',
    $title1$Los 5 estilos de baile que están marcando Latinoamérica$title1$,
    $excerpt1$De la Salsa que nunca pasa de moda al Hip Hop que llena academias enteras: un mapa de qué se está bailando en la región y por qué.$excerpt1$,
    $content1$Si estás pensando en empezar a bailar, probablemente ya descubriste el primer problema: hay demasiadas opciones.

Salsa, Bachata, Heels, Hip Hop, Reggaetón, Contemporáneo, Ballet, Flamenco… ¿por dónde empezar?

No existe un ranking oficial que determine cuál es el estilo más popular de Latinoamérica. Esta lista es una mirada a los estilos que tienen una presencia especialmente fuerte en la oferta de clases, la cultura de baile y las búsquedas de quienes quieren empezar.

Y recuerda: que un estilo esté en esta lista no significa que sea mejor que otro. **El mejor baile para ti es el que te dé ganas de volver.**

## **1. Salsa: el clásico que sigue vigente**

La Salsa sigue siendo una de las principales puertas de entrada al baile social.

Su gran ventaja es que lo aprendido en clase puede llevarse rápidamente a fiestas, sociales y otros espacios donde bailar con otras personas. Además, su presencia en Latinoamérica es enorme y forma parte de una historia cultural que combina diferentes tradiciones musicales y dancísticas del Caribe.

**Ideal si:** quieres bailar en pareja, conocer gente y disfrutar del baile fuera de la academia.

## **2. Bachata: aprender y salir a bailar**

La Bachata comparte con la Salsa ese componente social, pero tiene una personalidad propia.

Su estructura permite que muchos principiantes empiecen a reconocer patrones y disfrutar una canción relativamente rápido. Su importancia cultural también está reconocida internacionalmente: la Bachata dominicana forma parte del Patrimonio Cultural Inmaterial de la Humanidad desde 2019.

**Ideal si:** quieres aprender un baile de pareja y llevarlo rápidamente a una pista.

```cta
{"label":"Clases en Kynea","href":"/clases","image":"","style":"grande"}
```

## **3. Heels: bailar también es expresarse**

Heels combina coreografía, musicalidad, técnica y expresión corporal.

En los últimos años ha ganado presencia en academias de distintas ciudades latinoamericanas y se ha convertido en una alternativa para quienes quieren bailar sin depender de una pareja.

**Ideal si:** quieres trabajar tu expresión corporal, aprender coreografías y sentirte más cómodo ocupando el espacio.

## **4. Hip Hop y danzas urbanas: mucho más que una coreografía**

Las danzas urbanas reúnen diferentes estilos y culturas, desde Hip Hop y House hasta Breaking, Popping y Locking.

Hoy forman parte habitual de la programación de muchas academias y conectan especialmente con quienes llegan al baile a través de la música urbana, las coreografías y las redes sociales.

**Ideal si:** te gusta la música urbana, quieres aprender coreografías o explorar diferentes formas de movimiento.

## **5. Flamenco y danzas tradicionales: bailar también es conectar**

No todo el baile nace de las tendencias.

Flamenco, Marinera, Tango y otras danzas tradicionales mantienen comunidades activas en diferentes ciudades de la región. Su aprendizaje suele implicar un proceso técnico más profundo, pero también permite conectar con una historia y una cultura.

**Ideal si:** buscas una disciplina con tradición, técnica y una identidad cultural fuerte.

**¿Y cuál deberías probar?**

No necesitas elegir el baile “correcto”.

Puedes elegir Salsa porque quieres aprender a bailar en pareja. Bachata porque te encanta una canción. Heels porque quieres probar algo nuevo. Hip Hop porque viste una coreografía que te atrapó. O Flamenco porque siempre te ha llamado la atención.

Y tampoco tienes que comprometerte para siempre.

**Prueba una clase.**

Quizás te equivoques de paso, pierdas el ritmo o salgas pensando que no entendiste absolutamente nada. Es normal.

La pregunta importante no es si lo hiciste perfecto.

Es si al terminar pensaste:

**“Quiero volver.”**

Ese puede ser el mejor indicador de que encontraste un baile para ti.

En Kynea puedes explorar clases, profesores y academias según el estilo y la ciudad donde quieres bailar.

Tu próxima clase puede estar mucho más cerca de lo que crees.

---

**Fuentes y referencias**

1. **UNESCO — Bachata dominicana.** Patrimonio Cultural Inmaterial de la Humanidad, inscrita en 2019.\
   [UNESCO – Music and dance of Dominican Bachata](https://ich.unesco.org/en/RL/music-and-dance-of-dominican-bachata-01514?utm_source=chatgpt.com)
2. **UNESCO — Rumba cubana.** Información sobre la relación entre música, danza, comunidad e identidad cultural.\
   [UNESCO – Cuban Rumba](https://ich.unesco.org/en/RL/cuban-rumba-mestizaje-of-dance-and-music-and-all-the-cultural-practices-inherent-01185?utm_source=chatgpt.com)
3. **Studio 110 Dance — Bogotá.** Referencia de oferta actual de clases de Salsa, Bachata, Urbano y Heels en Colombia.\
   [Studio 110 Dance](https://studio110dance.com/?utm_source=chatgpt.com)
4. **Kynea.** Oferta y categorías de clases de baile disponibles en la plataforma.\
   [Kynea](https://www.kynea.dance/?utm_source=chatgpt.com)$content1$,
    'https://uibigobubqrolozvrkzd.supabase.co/storage/v1/object/public/blog-images/f0e87938-1e3b-4103-b364-1df0b77455fd/1789970280790.png',
    'Tendencias',
    'yellow',
    false,
    'published',
    '2026-09-21T06:06:35.66+00:00',
    v_author_id,
    $mtitle1$Los 5 estilos de baile que están marcando Latinoamérica — Kynea$mtitle1$,
    $mdesc1$Salsa, Heels, Bachata, Hip Hop y Flamenco: qué se está bailando en Latinoamérica en 2026 y por qué cada estilo atrae a un público distinto.$mdesc1$
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    cover_image = EXCLUDED.cover_image,
    category = EXCLUDED.category,
    accent_color = EXCLUDED.accent_color,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    meta_title = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description;

  -- 2. Los beneficios de bailar para tu cuerpo y tu mente, según la ciencia
  INSERT INTO public.blog_posts (
    id,
    slug,
    title,
    excerpt,
    content,
    cover_image,
    category,
    accent_color,
    is_featured,
    status,
    published_at,
    author_id,
    meta_title,
    meta_description
  ) VALUES (
    'e7115933-65ea-4af6-b4cb-149708e765ee',
    'los-beneficios-de-bailar-para-tu-cuerpo-y-tu-mente-segun-la-ciencia',
    $title2$Los beneficios de bailar para tu cuerpo y tu mente, según la ciencia$title2$,
    $excerpt2$Bailar no es solo una forma de pasarla bien: mejora tu condición física, tu memoria, tu manejo del estrés y tu vida social, todo al mismo tiempo.$excerpt2$,
    $content2$Cuando alguien piensa en "hacer ejercicio", rara vez piensa primero en bailar — pero la evidencia disponible sobre actividad física y bienestar coincide en algo: pocas actividades combinan tantos beneficios distintos en una sola sesión como el baile.

## Beneficios físicos: más que cardio

Una clase de baile de una hora es, sin dudas, ejercicio cardiovascular — pero también trabaja algo que el cardio tradicional casi nunca toca: la coordinación. Cada patrón de pasos exige que el cuerpo procese ritmo, dirección y equilibrio al mismo tiempo, lo que se traduce en mejor coordinación general y menor riesgo de caídas a medida que pasan los años, algo especialmente relevante en edades más avanzadas.

## Beneficios cognitivos: tu cerebro también baila

Aprender una secuencia de pasos nueva es, literalmente, un ejercicio de memoria activa: el cerebro tiene que codificar un patrón, recuperarlo bajo presión de tiempo (la música no espera), y ajustarlo sobre la marcha si te equivocas. Ese tipo de desafío cognitivo combinado con movimiento físico es parte de por qué actividades como el baile aparecen consistentemente entre las recomendadas para mantener la mente activa con el paso de los años.

## Bienestar emocional y manejo del estrés

Bailar libera endorfinas como cualquier actividad física intensa, pero suma un componente que el gimnasio tradicional no siempre tiene: la música. La combinación de movimiento y ritmo musical tiene un efecto real sobre el estado de ánimo, y para mucha gente se convierte en una de las formas más efectivas — y sostenibles en el tiempo — de descargar el estrés acumulado de la semana.

## Conexión social: el ingrediente que falta en el gimnasio

A diferencia de correr en una cinta o levantar pesas solo, una clase grupal de baile es inherentemente social: se comparte espacio, se rota de pareja, se aprende junto a otros que están en el mismo proceso. Esa dimensión social explica por qué tanta gente sostiene el hábito de bailar en el tiempo mucho más que otras rutinas de ejercicio que empiezan con entusiasmo y se abandonan a las pocas semanas.

## Cuánto necesitas bailar para notar la diferencia

No hace falta bailar todos los días para empezar a sentir beneficios. Una o dos clases grupales por semana, sostenidas durante uno o dos meses, ya suelen ser suficientes para notar mejoras en energía, ánimo y coordinación — la clave está más en la constancia que en la cantidad.

## Preguntas frecuentes

### ¿Bailar cuenta como ejercicio cardiovascular?

Sí. Una clase de baile de intensidad media a alta eleva la frecuencia cardíaca de forma sostenida, de manera comparable a otras actividades aeróbicas tradicionales.

### ¿A qué edad es tarde para empezar a bailar?

Nunca. Los beneficios de coordinación, memoria y bienestar emocional aplican en cualquier etapa de la vida, y la mayoría de las academias tienen clases para principiantes absolutos sin límite de edad.

Si buscas una forma de moverte que además te haga sentir bien, [explora las clases disponibles en tu ciudad](/clases) y prueba tu primera sesión esta semana.$content2$,
    'https://uibigobubqrolozvrkzd.supabase.co/storage/v1/object/public/blog-images/f0e87938-1e3b-4103-b364-1df0b77455fd/1789969259048.jpg',
    'Bienestar',
    'grape',
    false,
    'published',
    '2026-09-21T05:33:54.727+00:00',
    v_author_id,
    $mtitle2$Beneficios de bailar para tu cuerpo y tu mente — Kynea$mtitle2$,
    $mdesc2$Qué dice la evidencia sobre los beneficios físicos, cognitivos y emocionales de bailar, y cuánto necesitás bailar por semana para notar la diferencia.$mdesc2$
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    cover_image = EXCLUDED.cover_image,
    category = EXCLUDED.category,
    accent_color = EXCLUDED.accent_color,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    meta_title = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description;

  -- 3. ¿Qué baile elegir? Guía para encontrar el estilo ideal para ti
  INSERT INTO public.blog_posts (
    id,
    slug,
    title,
    excerpt,
    content,
    cover_image,
    category,
    accent_color,
    is_featured,
    status,
    published_at,
    author_id,
    meta_title,
    meta_description
  ) VALUES (
    '2294de9b-1265-4ead-a75c-86c6e0ef3a2d',
    'como-elegir-tu-primer-estilo-de-baile-en-lima',
    $title3$¿Qué baile elegir? Guía para encontrar el estilo ideal para ti$title3$,
    $excerpt3$Salsa, Heels, Hip Hop, Flamenco... si nunca bailaste y no sabes por dónde arrancar, esta guía te ayuda a elegir según tu personalidad, tu objetivo y tu nivel de comodidad con el cuerpo.$excerpt3$,
    $content3$**¿Qué baile elegir? Guía para encontrar el estilo ideal para ti**

Empezar a bailar de adulto puede dar un poco de vértigo.

Quizás llevas meses pensando “algún día debería probar una clase”. Tal vez viste un video en Instagram y te dieron ganas de intentarlo, pero cuando empiezas a buscar aparecen salsa, bachata, heels, hip hop, ballet, contemporáneo, reggaetón, dancehall… y de pronto parece que elegir una clase es más difícil que aprender la coreografía.

La buena noticia es que no tienes que saber bailar para empezar a bailar. Tampoco necesitas tener “talento”, flexibilidad o coordinación desde el primer día.

Solo necesitas encontrar un lugar por donde comenzar.

Estas preguntas pueden ayudarte a descubrir qué estilo podría conectar contigo.

## **¿Te imaginas bailando con alguien o por tu cuenta?**

Piensa en cómo te gustaría vivir el baile.

Si te imaginas aprendiendo pasos para bailar en fiestas, compartir con otras personas o simplemente disfrutar una canción con alguien más, Salsa y Bachata pueden ser una buena puerta de entrada. Además de aprender a bailar, vas a encontrarte con comunidades muy sociales donde es común practicar y conocer gente nueva.

Pero quizás lo que buscas es otra cosa.

Si quieres bailar para ti, explorar tu movimiento y no depender de una pareja, puedes mirar opciones como Heels, Hip Hop, Contemporáneo o Dancehall. Cada una tiene su propio lenguaje y personalidad, así que aquí vale mucho la pena dejarte llevar por lo que visualmente te atraiga.

No hay una opción correcta. Hay una que probablemente se parezca más a lo que estás buscando hoy.

```cta
{"label":"Explorar clases en Kynea","href":"/clases","image":"","style":"compacto"}
```

## **¿Quieres aprender técnica o simplemente necesitas soltarte?**

Hay estilos donde la técnica ocupa un lugar muy importante.

En Ballet, Flamenco o Contemporáneo, por ejemplo, vas a trabajar aspectos como postura, coordinación, musicalidad y control corporal. El progreso puede sentirse diferente porque estás construyendo herramientas que tu cuerpo todavía no conoce.

Y eso también puede ser muy gratificante.

Si lo que quieres es empezar moviéndote, disfrutar la música y sentir que poco a poco vas perdiendo la vergüenza, puedes explorar estilos como Reggaetón, Hip Hop o Dancehall.

Pero ojo: no existe un estilo “sin técnica”. Todos tienen algo que aprender. La diferencia está en qué tipo de aprendizaje te resulta más atractivo.

## **No elijas el baile que crees que deberías bailar**

Este quizás sea el consejo más importante.

No tienes que elegir Salsa porque es popular. No tienes que hacer Ballet porque quieres mejorar tu postura. No tienes que hacer Heels porque viste una coreografía increíble en TikTok.

Empieza por aquello que te despierta curiosidad.

¿Hay una canción que siempre terminas bailando cuando suena?

¿Hay un video que viste varias veces porque te encantó?

¿Hay alguien que baila y pensaste “yo quisiera hacer eso”?

Ahí puede haber una pista.

A veces el mejor estilo para empezar no es el que parece más lógico sobre el papel, sino el que consigue que tengas ganas de volver a la siguiente clase.

## **No necesitas llegar sabiendo bailar**

Este miedo es probablemente uno de los más comunes: “¿y si todos saben bailar menos yo?”

La mayoría de las clases para principiantes existen precisamente porque nadie espera que llegues sabiendo.

Vas a equivocarte de paso. Vas a perderte. Probablemente vas a mirar al profesor intentando descifrar qué acaba de hacer con las piernas.

Y está bien.

Aprender a bailar implica pasar por esa etapa incómoda en la que tu cabeza entiende la secuencia, pero tu cuerpo todavía está procesándola.

No necesitas hacerlo perfecto. Necesitas darte permiso para ser principiante.

## **Prueba antes de comprometerte**

Si todavía no sabes qué estilo elegir, no tienes que decidirlo para todo el año.

Prueba una clase de Salsa. Después una de Hip Hop. Quizás una de Bachata o Contemporáneo.

Incluso puedes descubrir que el estilo que más te gustaba desde fuera no era el que más disfrutaste en clase. Y también puede pasar lo contrario: que encuentres uno que nunca habías considerado y salgas pensando “esto era lo que estaba buscando”.

Una clase puede darte más información que veinte videos de Instagram.

## **Entonces, ¿qué baile deberías elegir?**

El que te dé ganas de volver.

Puede ser por la música, por la energía de la clase, por la comunidad, por el profesor o simplemente porque durante una hora te olvidaste del trabajo, del celular y de todo lo demás.

Y si todavía no sabes cuál es, tampoco pasa nada.

No tienes que encontrar tu estilo ideal antes de empezar. Puedes descubrirlo bailando.

En Kynea queremos ayudarte justamente con eso: encontrar clases, profesores y academias para que puedas probar, comparar y encontrar el baile que se sienta tuyo.$content3$,
    'https://uibigobubqrolozvrkzd.supabase.co/storage/v1/object/public/blog-images/f0e87938-1e3b-4103-b364-1df0b77455fd/1789965098248.jpg',
    'Guías',
    'lilac',
    false,
    'published',
    '2026-09-21T04:40:52.261+00:00',
    v_author_id,
    $mtitle3$Cómo elegir tu primer estilo de baile — Guía 2026$mtitle3$,
    $mdesc3$Salsa, Heels, Hip Hop o Flamenco: una guía práctica para elegir tu primer estilo de baile en Lima según tu personalidad y objetivo.$mdesc3$
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    cover_image = EXCLUDED.cover_image,
    category = EXCLUDED.category,
    accent_color = EXCLUDED.accent_color,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    meta_title = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description;
END;
$$;
