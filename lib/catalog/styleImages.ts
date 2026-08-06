// One curated photo per dance style, keyed by slug — add an entry here as
// more get uploaded to public/categorias/. Styles without an entry yet fall
// back to FALLBACK_CATEGORY_IMAGES (round-robin) so nothing ever 404s.
export const STYLE_IMAGES: Record<string, string> = {
  'salsa':         '/categorias/salsa.jpg',
  'bachata':       '/categorias/bachata.jpg',
  'heels':         '/categorias/hills.jpg',
  'reggaeton':     '/categorias/Reggaeton.jpg',
  'hip-hop':       '/categorias/hiphop.jpeg',
  'urbano':        '/categorias/urbano.jpg',
  'contemporaneo': '/categorias/comtempo.jpeg',
  'ballet':        '/categorias/ballet.jpg',
  'jazz-funk':     '/categorias/jazzfunk.png',
};

export const FALLBACK_CATEGORY_IMAGES = [
  '/categorias/rainier-ridao-GRDpPpKczdY-unsplash.jpg',
  '/categorias/barrett-smith-uB4cOqtOf90-unsplash.jpg',
];

// Fallback gradients shown behind the photo while it loads (also color variety across cards)
export const CATEGORY_GRADIENTS = [
  'linear-gradient(135deg, #8a11bc 0%, #4a0a67 100%)',
  'linear-gradient(135deg, #A8C8F8 0%, #4b6fd6 100%)',
  'linear-gradient(135deg, #00D68F 0%, #00745A 100%)',
  'linear-gradient(135deg, #d499f0 0%, #8a11bc 100%)',
  'linear-gradient(135deg, #FFE040 0%, #d68f2f 100%)',
  'linear-gradient(135deg, #e8c5f7 0%, #6d0d97 100%)',
];
