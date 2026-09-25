import { normalizeSearchText } from './countries';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  countries?: string[];
}

export const POPULAR_CURRENCY_CODES = [
  'PEN',
  'USD',
  'CLP',
  'EUR',
  'ARS',
  'COP',
  'MXN',
  'BRL',
  'BOB',
  'UYU',
  'PYG',
  'CRC',
  'DOP',
  'GTQ',
  'GBP',
];

export const CURRENCIES: Currency[] = [
  // ── Monedas más usadas en la región y el mundo ──
  {
    code: 'PEN',
    name: 'Sol peruano',
    symbol: 'S/',
    flag: '🇵🇪',
    countries: ['Perú', 'Peru'],
  },
  {
    code: 'USD',
    name: 'Dólar estadounidense',
    symbol: '$',
    flag: '🇺🇸',
    countries: ['Estados Unidos', 'USA', 'Ecuador', 'El Salvador', 'Panamá'],
  },
  {
    code: 'CLP',
    name: 'Peso chileno',
    symbol: '$',
    flag: '🇨🇱',
    countries: ['Chile'],
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    countries: ['España', 'Europa', 'Francia', 'Alemania', 'Italia', 'Portugal'],
  },
  {
    code: 'ARS',
    name: 'Peso argentino',
    symbol: '$',
    flag: '🇦🇷',
    countries: ['Argentina'],
  },
  {
    code: 'COP',
    name: 'Peso colombiano',
    symbol: '$',
    flag: '🇨🇴',
    countries: ['Colombia'],
  },
  {
    code: 'MXN',
    name: 'Peso mexicano',
    symbol: '$',
    flag: '🇲🇽',
    countries: ['México', 'Mexico'],
  },
  {
    code: 'BRL',
    name: 'Real brasileño',
    symbol: 'R$',
    flag: '🇧🇷',
    countries: ['Brasil', 'Brazil'],
  },
  {
    code: 'BOB',
    name: 'Boliviano',
    symbol: 'Bs',
    flag: '🇧🇴',
    countries: ['Bolivia'],
  },
  {
    code: 'UYU',
    name: 'Peso uruguayo',
    symbol: '$U',
    flag: '🇺🇾',
    countries: ['Uruguay'],
  },
  {
    code: 'PYG',
    name: 'Guaraní paraguayo',
    symbol: '₲',
    flag: '🇵🇾',
    countries: ['Paraguay'],
  },
  {
    code: 'CRC',
    name: 'Colón costarricense',
    symbol: '₡',
    flag: '🇨🇷',
    countries: ['Costa Rica'],
  },
  {
    code: 'DOP',
    name: 'Peso dominicano',
    symbol: 'RD$',
    flag: '🇩🇴',
    countries: ['República Dominicana'],
  },
  {
    code: 'GTQ',
    name: 'Quetzal guatemalteco',
    symbol: 'Q',
    flag: '🇬🇹',
    countries: ['Guatemala'],
  },
  {
    code: 'HNL',
    name: 'Lempira hondureño',
    symbol: 'L',
    flag: '🇭🇳',
    countries: ['Honduras'],
  },
  {
    code: 'NIO',
    name: 'Córdoba nicaragüense',
    symbol: 'C$',
    flag: '🇳🇮',
    countries: ['Nicaragua'],
  },
  {
    code: 'PAB',
    name: 'Balboa panameño',
    symbol: 'B/.',
    flag: '🇵🇦',
    countries: ['Panamá', 'Panama'],
  },
  {
    code: 'VES',
    name: 'Bolívar venezolano',
    symbol: 'Bs.',
    flag: '🇻🇪',
    countries: ['Venezuela'],
  },
  {
    code: 'CAD',
    name: 'Dólar canadiense',
    symbol: 'CA$',
    flag: '🇨🇦',
    countries: ['Canadá', 'Canada'],
  },
  {
    code: 'GBP',
    name: 'Libra esterlina',
    symbol: '£',
    flag: '🇬🇧',
    countries: ['Reino Unido', 'Inglaterra', 'UK'],
  },
  {
    code: 'AUD',
    name: 'Dólar australiano',
    symbol: 'A$',
    flag: '🇦🇺',
    countries: ['Australia'],
  },
  {
    code: 'JPY',
    name: 'Yen japonés',
    symbol: '¥',
    flag: '🇯🇵',
    countries: ['Japón', 'Japan'],
  },
  {
    code: 'CHF',
    name: 'Franco suizo',
    symbol: 'CHF',
    flag: '🇨🇭',
    countries: ['Suiza'],
  },
  {
    code: 'CNY',
    name: 'Yuan chino',
    symbol: '¥',
    flag: '🇨🇳',
    countries: ['China'],
  },
  {
    code: 'NZD',
    name: 'Dólar neozelandés',
    symbol: 'NZ$',
    flag: '🇳🇿',
    countries: ['Nueva Zelanda'],
  },

  // ── Resto del mundo (alfabético por código) ──
  { code: 'AED', name: 'Dírham de EAU', symbol: 'د.إ', flag: '🇦🇪', countries: ['Emiratos Árabes Unidos', 'Dubái'] },
  { code: 'AFN', name: 'Afgani afgano', symbol: '؋', flag: '🇦🇫', countries: ['Afganistán'] },
  { code: 'ALL', name: 'Lek albanés', symbol: 'L', flag: '🇦🇱', countries: ['Albania'] },
  { code: 'AMD', name: 'Dram armenio', symbol: '֏', flag: '🇦🇲', countries: ['Armenia'] },
  { code: 'ANG', name: 'Florín antillano', symbol: 'ƒ', flag: '🇨🇼', countries: ['Curazao', 'Sint Maarten'] },
  { code: 'AOA', name: 'Kwanza angoleño', symbol: 'Kz', flag: '🇦🇴', countries: ['Angola'] },
  { code: 'AWG', name: 'Florín arubeño', symbol: 'ƒ', flag: '🇦🇼', countries: ['Aruba'] },
  { code: 'AZN', name: 'Manat azerbaiyano', symbol: '₼', flag: '🇦🇿', countries: ['Azerbaiyán'] },
  { code: 'BAM', name: 'Marco bosnioherzegovino', symbol: 'KM', flag: '🇧🇦', countries: ['Bosnia y Herzegovina'] },
  { code: 'BBD', name: 'Dólar de Barbados', symbol: 'Bds$', flag: '🇧🇧', countries: ['Barbados'] },
  { code: 'BDT', name: 'Taka bangladesí', symbol: '৳', flag: '🇧🇩', countries: ['Bangladés'] },
  { code: 'BGN', name: 'Lev búlgaro', symbol: 'лв', flag: '🇧🇬', countries: ['Bulgaria'] },
  { code: 'BHD', name: 'Dinar bareiní', symbol: 'BD', flag: '🇧🇭', countries: ['Baréin'] },
  { code: 'BIF', name: 'Franco burundés', symbol: 'FBu', flag: '🇧🇮', countries: ['Burundi'] },
  { code: 'BMD', name: 'Dólar bermudeño', symbol: '$', flag: '🇧🇲', countries: ['Bermudas'] },
  { code: 'BND', name: 'Dólar de Brunéi', symbol: 'B$', flag: '🇧🇳', countries: ['Brunéi'] },
  { code: 'BSD', name: 'Dólar bahameño', symbol: 'B$', flag: '🇧🇸', countries: ['Bahamas'] },
  { code: 'BTN', name: 'Ngultrum butanés', symbol: 'Nu.', flag: '🇧🇹', countries: ['Bután'] },
  { code: 'BWP', name: 'Pula botsuana', symbol: 'P', flag: '🇧🇼', countries: ['Botsuana'] },
  { code: 'BYN', name: 'Rublo bielorruso', symbol: 'Br', flag: '🇧🇾', countries: ['Bielorrusia'] },
  { code: 'BZD', name: 'Dólar beliceño', symbol: 'BZ$', flag: '🇧🇿', countries: ['Belice'] },
  { code: 'CDF', name: 'Franco congoleño', symbol: 'FC', flag: '🇨🇩', countries: ['Congo'] },
  { code: 'CUP', name: 'Peso cubano', symbol: '$', flag: '🇨🇺', countries: ['Cuba'] },
  { code: 'CVE', name: 'Escudo caboverdiano', symbol: '$', flag: '🇨🇻', countries: ['Cabo Verde'] },
  { code: 'CZK', name: 'Corona checa', symbol: 'Kč', flag: '🇨🇿', countries: ['República Checa'] },
  { code: 'DJF', name: 'Franco yibutiano', symbol: 'Fdj', flag: '🇩🇯', countries: ['Yibuti'] },
  { code: 'DKK', name: 'Corona danesa', symbol: 'kr', flag: '🇩🇰', countries: ['Dinamarca'] },
  { code: 'DZD', name: 'Dinar argelino', symbol: 'DA', flag: '🇩🇿', countries: ['Argelia'] },
  { code: 'EGP', name: 'Libra egipcia', symbol: 'E£', flag: '🇪🇬', countries: ['Egipto'] },
  { code: 'ERN', name: 'Nakfa eritreo', symbol: 'Nfk', flag: '🇪🇷', countries: ['Eritrea'] },
  { code: 'ETB', name: 'Birr etíope', symbol: 'Br', flag: '🇪🇹', countries: ['Etiopía'] },
  { code: 'FJD', name: 'Dólar fiyiano', symbol: 'FJ$', flag: '🇫🇯', countries: ['Fiyi'] },
  { code: 'FKP', name: 'Libra malvinense', symbol: '£', flag: '🇫🇰', countries: ['Islas Malvinas'] },
  { code: 'GEL', name: 'Lari georgiano', symbol: '₾', flag: '🇬🇪', countries: ['Georgia'] },
  { code: 'GHS', name: 'Cedi ghanés', symbol: 'GH₵', flag: '🇬🇭', countries: ['Ghana'] },
  { code: 'GIP', name: 'Libra gibraltareña', symbol: '£', flag: '🇬🇮', countries: ['Gibraltar'] },
  { code: 'GMD', name: 'Dalasi gambiano', symbol: 'D', flag: '🇬🇲', countries: ['Gambia'] },
  { code: 'GNF', name: 'Franco guineano', symbol: 'FG', flag: '🇬🇳', countries: ['Guinea'] },
  { code: 'GYD', name: 'Dólar guyanés', symbol: 'G$', flag: '🇬🇾', countries: ['Guyana'] },
  { code: 'HKD', name: 'Dólar de Hong Kong', symbol: 'HK$', flag: '🇭🇰', countries: ['Hong Kong'] },
  { code: 'HTG', name: 'Gourde haitiano', symbol: 'G', flag: '🇭🇹', countries: ['Haití'] },
  { code: 'HUF', name: 'Forinto húngaro', symbol: 'Ft', flag: '🇭🇺', countries: ['Hungría'] },
  { code: 'IDR', name: 'Rupia indonesia', symbol: 'Rp', flag: '🇮🇩', countries: ['Indonesia'] },
  { code: 'ILS', name: 'Nuevo séquel israelí', symbol: '₪', flag: '🇮🇱', countries: ['Israel'] },
  { code: 'INR', name: 'Rupia india', symbol: '₹', flag: '🇮🇳', countries: ['India'] },
  { code: 'IQD', name: 'Dinar iraquí', symbol: 'ع.د', flag: '🇮🇶', countries: ['Irak'] },
  { code: 'IRR', name: 'Rial iraní', symbol: '﷼', flag: '🇮🇷', countries: ['Irán'] },
  { code: 'ISK', name: 'Corona islandesa', symbol: 'kr', flag: '🇮🇸', countries: ['Islandia'] },
  { code: 'JMD', name: 'Dólar jamaiquino', symbol: 'J$', flag: '🇯🇲', countries: ['Jamaica'] },
  { code: 'JOD', name: 'Dinar jordano', symbol: 'JD', flag: '🇯🇴', countries: ['Jordania'] },
  { code: 'KES', name: 'Chelín keniano', symbol: 'KSh', flag: '🇰🇪', countries: ['Kenia'] },
  { code: 'KGS', name: 'Som kirguís', symbol: 'сом', flag: '🇰🇬', countries: ['Kirguistán'] },
  { code: 'KHR', name: 'Riel camboyano', symbol: '៛', flag: '🇰🇭', countries: ['Camboya'] },
  { code: 'KMF', name: 'Franco comorense', symbol: 'CF', flag: '🇰🇲', countries: ['Comoras'] },
  { code: 'KRW', name: 'Won surcoreano', symbol: '₩', flag: '🇰🇷', countries: ['Corea del Sur'] },
  { code: 'KWD', name: 'Dinar kuwaití', symbol: 'د.ك', flag: '🇰🇼', countries: ['Kuwait'] },
  { code: 'KYD', name: 'Dólar de las Islas Caimán', symbol: 'CI$', flag: '🇰🇾', countries: ['Islas Caimán'] },
  { code: 'KZT', name: 'Tenge kazajo', symbol: '₸', flag: '🇰🇿', countries: ['Kazajistán'] },
  { code: 'LAK', name: 'Kip laosiano', symbol: '₭', flag: '🇱🇦', countries: ['Laos'] },
  { code: 'LBP', name: 'Libra libanesa', symbol: 'L£', flag: '🇱🇧', countries: ['Líbano'] },
  { code: 'LKR', name: 'Rupia de Sri Lanka', symbol: 'Rs', flag: '🇱🇰', countries: ['Sri Lanka'] },
  { code: 'LRD', name: 'Dólar liberiano', symbol: 'L$', flag: '🇱🇷', countries: ['Liberia'] },
  { code: 'LSL', name: 'Loti lesotense', symbol: 'L', flag: '🇱🇸', countries: ['Lesoto'] },
  { code: 'LYD', name: 'Dinar libio', symbol: 'LD', flag: '🇱🇾', countries: ['Libia'] },
  { code: 'MAD', name: 'Dírham marroquí', symbol: 'MAD', flag: '🇲🇦', countries: ['Marruecos'] },
  { code: 'MDL', name: 'Leu moldavo', symbol: 'L', flag: '🇲🇩', countries: ['Moldavia'] },
  { code: 'MGA', name: 'Ariary malgache', symbol: 'Ar', flag: '🇲🇬', countries: ['Madagascar'] },
  { code: 'MKD', name: 'Denar macedonio', symbol: 'ден', flag: '🇲🇰', countries: ['Macedonia del Norte'] },
  { code: 'MMK', name: 'Kyat birmano', symbol: 'K', flag: '🇲🇲', countries: ['Myanmar', 'Birmania'] },
  { code: 'MNT', name: 'Tugrik mongol', symbol: '₮', flag: '🇲🇳', countries: ['Mongolia'] },
  { code: 'MOP', name: 'Pataca de Macao', symbol: 'MOP$', flag: '🇲🇴', countries: ['Macao'] },
  { code: 'MRU', name: 'Uguiya mauritana', symbol: 'UM', flag: '🇲🇷', countries: ['Mauritania'] },
  { code: 'MUR', name: 'Rupia mauriciana', symbol: '₨', flag: '🇲🇺', countries: ['Mauricio'] },
  { code: 'MVR', name: 'Rufiyaa maldiva', symbol: 'Rf', flag: '🇲🇻', countries: ['Maldivas'] },
  { code: 'MWK', name: 'Kwacha malauí', symbol: 'MK', flag: '🇲🇼', countries: ['Malaui'] },
  { code: 'MYR', name: 'Ringgit malayo', symbol: 'RM', flag: '🇲🇾', countries: ['Malasia'] },
  { code: 'MZN', name: 'Metical mozambiqueño', symbol: 'MT', flag: '🇲🇿', countries: ['Mozambique'] },
  { code: 'NAD', name: 'Dólar namibio', symbol: 'N$', flag: '🇳🇦', countries: ['Namibia'] },
  { code: 'NGN', name: 'Naira nigeriana', symbol: '₦', flag: '🇳🇬', countries: ['Nigeria'] },
  { code: 'NOK', name: 'Corona noruega', symbol: 'kr', flag: '🇳🇴', countries: ['Noruega'] },
  { code: 'NPR', name: 'Rupia nepalí', symbol: '₨', flag: '🇳🇵', countries: ['Nepal'] },
  { code: 'OMR', name: 'Rial omaní', symbol: 'ر.ع.', flag: '🇴🇲', countries: ['Omán'] },
  { code: 'PGK', name: 'Kina de Papúa Nueva Guinea', symbol: 'K', flag: '🇵🇬', countries: ['Papúa Nueva Guinea'] },
  { code: 'PHP', name: 'Peso filipino', symbol: '₱', flag: '🇵🇭', countries: ['Filipinas'] },
  { code: 'PKR', name: 'Rupia pakistaní', symbol: '₨', flag: '🇵🇰', countries: ['Pakistán'] },
  { code: 'PLN', name: 'Zloty polaco', symbol: 'zł', flag: '🇵🇱', countries: ['Polonia'] },
  { code: 'QAR', name: 'Riyal catarí', symbol: 'ر.ق', flag: '🇶🇦', countries: ['Catar', 'Qatar'] },
  { code: 'RON', name: 'Leu rumano', symbol: 'lei', flag: '🇷🇴', countries: ['Rumanía'] },
  { code: 'RSD', name: 'Dinar serbio', symbol: 'дин.', flag: '🇷🇸', countries: ['Serbia'] },
  { code: 'RUB', name: 'Rublo ruso', symbol: '₽', flag: '🇷🇺', countries: ['Rusia'] },
  { code: 'RWF', name: 'Franco ruandés', symbol: 'FRw', flag: '🇷🇼', countries: ['Ruanda'] },
  { code: 'SAR', name: 'Riyal saudí', symbol: '﷼', flag: '🇸🇦', countries: ['Arabia Saudí'] },
  { code: 'SBD', name: 'Dólar de las Islas Salomón', symbol: 'SI$', flag: '🇸🇧', countries: ['Islas Salomón'] },
  { code: 'SCR', name: 'Rupia de Seychelles', symbol: 'SR', flag: '🇸🇨', countries: ['Seychelles'] },
  { code: 'SDG', name: 'Libra sudanesa', symbol: 'SDG', flag: '🇸🇩', countries: ['Sudán'] },
  { code: 'SEK', name: 'Corona sueca', symbol: 'kr', flag: '🇸🇪', countries: ['Suecia'] },
  { code: 'SGD', name: 'Dólar de Singapur', symbol: 'S$', flag: '🇸🇬', countries: ['Singapur'] },
  { code: 'SLE', name: 'Leona de Sierra Leona', symbol: 'Le', flag: '🇸🇱', countries: ['Sierra Leona'] },
  { code: 'SOS', name: 'Chelín somalí', symbol: 'Sh.So.', flag: '🇸🇴', countries: ['Somalia'] },
  { code: 'SRD', name: 'Dólar surinamés', symbol: '$', flag: '🇸🇷', countries: ['Surinam'] },
  { code: 'SSP', name: 'Libra sursudanesa', symbol: 'SS£', flag: '🇸🇸', countries: ['Sudán del Sur'] },
  { code: 'STN', name: 'Dobra santotomense', symbol: 'Db', flag: '🇸🇹', countries: ['Santo Tomé y Príncipe'] },
  { code: 'SVC', name: 'Colón salvadoreño', symbol: '₡', flag: '🇸🇻', countries: ['El Salvador'] },
  { code: 'SYP', name: 'Libra siria', symbol: 'LS', flag: '🇸🇾', countries: ['Siria'] },
  { code: 'SZL', name: 'Lilangeni suazi', symbol: 'E', flag: '🇸🇿', countries: ['Esuatini', 'Suazilandia'] },
  { code: 'THB', name: 'Baht tailandés', symbol: '฿', flag: '🇹🇭', countries: ['Tailandia'] },
  { code: 'TJS', name: 'Somoni tayiko', symbol: 'SM', flag: '🇹🇯', countries: ['Tayikistán'] },
  { code: 'TMT', name: 'Manat turcomano', symbol: 'T', flag: '🇹🇲', countries: ['Turkmenistán'] },
  { code: 'TND', name: 'Dinar tunecino', symbol: 'DT', flag: '🇹🇳', countries: ['Túnez'] },
  { code: 'TOP', name: 'Paʻanga tongano', symbol: 'T$', flag: '🇹🇴', countries: ['Tonga'] },
  { code: 'TRY', name: 'Lira turca', symbol: '₺', flag: '🇹🇷', countries: ['Turquía'] },
  { code: 'TTD', name: 'Dólar de Trinidad y Tobago', symbol: 'TT$', flag: '🇹🇹', countries: ['Trinidad y Tobago'] },
  { code: 'TWD', name: 'Nuevo dólar taiwanés', symbol: 'NT$', flag: '🇹🇼', countries: ['Taiwán'] },
  { code: 'TZS', name: 'Chelín tanzano', symbol: 'TSh', flag: '🇹🇿', countries: ['Tanzania'] },
  { code: 'UAH', name: 'Grivna ucraniana', symbol: '₴', flag: '🇺🇦', countries: ['Ucrania'] },
  { code: 'UGX', name: 'Chelín ugandés', symbol: 'USh', flag: '🇺🇬', countries: ['Uganda'] },
  { code: 'UZS', name: 'Som uzbeko', symbol: "so'm", flag: '🇺🇿', countries: ['Uzbekistán'] },
  { code: 'VND', name: 'Dong vietnamita', symbol: '₫', flag: '🇻🇳', countries: ['Vietnam'] },
  { code: 'VUV', name: 'Vatu vanuatuense', symbol: 'VT', flag: '🇻🇺', countries: ['Vanuatu'] },
  { code: 'WST', name: 'Tala samoana', symbol: 'WS$', flag: '🇼🇸', countries: ['Samoa'] },
  { code: 'XAF', name: 'Franco CFA de África Central', symbol: 'FCFA', flag: '🌍', countries: ['Camerún', 'Gabón', 'Chad'] },
  { code: 'XCD', name: 'Dólar del Caribe Oriental', symbol: 'EC$', flag: '🏝️', countries: ['Caribe Oriental', 'Santa Lucía', 'Antigua y Barbuda'] },
  { code: 'XOF', name: 'Franco CFA de África Occidental', symbol: 'CFA', flag: '🌍', countries: ['Senegal', 'Costa de Marfil', 'Mali'] },
  { code: 'XPF', name: 'Franco CFP', symbol: 'CFP', flag: '🇵🇫', countries: ['Polinesia Francesa', 'Nueva Caledonia'] },
  { code: 'YER', name: 'Rial yemení', symbol: '﷼', flag: '🇾🇪', countries: ['Yemen'] },
  { code: 'ZAR', name: 'Rand sudafricano', symbol: 'R', flag: '🇿🇦', countries: ['Sudáfrica'] },
  { code: 'ZMW', name: 'Kwacha zambiano', symbol: 'ZK', flag: '🇿🇲', countries: ['Zambia'] },
  { code: 'ZWL', name: 'Dólar zimbabuense', symbol: 'Z$', flag: '🇿🇼', countries: ['Zimbabue'] },
];

/**
 * Busca una moneda por su código ISO (ej: 'PEN', 'CLP', 'USD').
 */
export function findCurrencyByCode(code: string | null | undefined): Currency | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return CURRENCIES.find(c => c.code === upper);
}

/**
 * Retorna el símbolo de la moneda correspondiente o un fallback adecuado.
 */
export function getCurrencySymbol(code: string | null | undefined): string {
  if (!code) return '$';
  const curr = findCurrencyByCode(code);
  return curr?.symbol || '$';
}

/**
 * Filtra monedas según un término de búsqueda (coincide por código, nombre o países asociados).
 */
export function filterCurrencies(search: string): Currency[] {
  const query = normalizeSearchText(search);
  if (!query) return CURRENCIES;

  return CURRENCIES.filter(curr => {
    if (curr.code.toLowerCase().includes(query)) return true;
    if (normalizeSearchText(curr.name).includes(query)) return true;
    if (curr.countries && curr.countries.some(c => normalizeSearchText(c).includes(query))) return true;
    return false;
  });
}
