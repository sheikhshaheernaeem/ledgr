export interface CountryConfig {
  name: string;
  flag: string;
  currency: string;
  locale: string;
  timezone: string;
  taxName: string;
  defaultTaxRate: number;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  // North America
  US: { name: "United States",     flag: "🇺🇸", currency: "USD", locale: "en-US", timezone: "America/New_York",    taxName: "Sales Tax", defaultTaxRate: 0    },
  CA: { name: "Canada",             flag: "🇨🇦", currency: "CAD", locale: "en-CA", timezone: "America/Toronto",      taxName: "GST/HST",   defaultTaxRate: 5    },
  MX: { name: "Mexico",             flag: "🇲🇽", currency: "MXN", locale: "es-MX", timezone: "America/Mexico_City",  taxName: "IVA",       defaultTaxRate: 16   },

  // Europe
  GB: { name: "United Kingdom",     flag: "🇬🇧", currency: "GBP", locale: "en-GB", timezone: "Europe/London",        taxName: "VAT",       defaultTaxRate: 20   },
  DE: { name: "Germany",            flag: "🇩🇪", currency: "EUR", locale: "de-DE", timezone: "Europe/Berlin",         taxName: "MwSt",      defaultTaxRate: 19   },
  FR: { name: "France",             flag: "🇫🇷", currency: "EUR", locale: "fr-FR", timezone: "Europe/Paris",          taxName: "TVA",       defaultTaxRate: 20   },
  ES: { name: "Spain",              flag: "🇪🇸", currency: "EUR", locale: "es-ES", timezone: "Europe/Madrid",         taxName: "IVA",       defaultTaxRate: 21   },
  IT: { name: "Italy",              flag: "🇮🇹", currency: "EUR", locale: "it-IT", timezone: "Europe/Rome",           taxName: "IVA",       defaultTaxRate: 22   },
  NL: { name: "Netherlands",        flag: "🇳🇱", currency: "EUR", locale: "nl-NL", timezone: "Europe/Amsterdam",      taxName: "BTW",       defaultTaxRate: 21   },
  BE: { name: "Belgium",            flag: "🇧🇪", currency: "EUR", locale: "nl-BE", timezone: "Europe/Brussels",       taxName: "BTW/TVA",   defaultTaxRate: 21   },
  SE: { name: "Sweden",             flag: "🇸🇪", currency: "SEK", locale: "sv-SE", timezone: "Europe/Stockholm",      taxName: "Moms",      defaultTaxRate: 25   },
  NO: { name: "Norway",             flag: "🇳🇴", currency: "NOK", locale: "nb-NO", timezone: "Europe/Oslo",           taxName: "MVA",       defaultTaxRate: 25   },
  DK: { name: "Denmark",            flag: "🇩🇰", currency: "DKK", locale: "da-DK", timezone: "Europe/Copenhagen",     taxName: "Moms",      defaultTaxRate: 25   },
  FI: { name: "Finland",            flag: "🇫🇮", currency: "EUR", locale: "fi-FI", timezone: "Europe/Helsinki",       taxName: "ALV",       defaultTaxRate: 24   },
  CH: { name: "Switzerland",        flag: "🇨🇭", currency: "CHF", locale: "de-CH", timezone: "Europe/Zurich",         taxName: "MWST",      defaultTaxRate: 7.7  },
  PL: { name: "Poland",             flag: "🇵🇱", currency: "PLN", locale: "pl-PL", timezone: "Europe/Warsaw",         taxName: "VAT",       defaultTaxRate: 23   },
  PT: { name: "Portugal",           flag: "🇵🇹", currency: "EUR", locale: "pt-PT", timezone: "Europe/Lisbon",         taxName: "IVA",       defaultTaxRate: 23   },
  IE: { name: "Ireland",            flag: "🇮🇪", currency: "EUR", locale: "en-IE", timezone: "Europe/Dublin",         taxName: "VAT",       defaultTaxRate: 23   },
  AT: { name: "Austria",            flag: "🇦🇹", currency: "EUR", locale: "de-AT", timezone: "Europe/Vienna",         taxName: "MwSt",      defaultTaxRate: 20   },
  RO: { name: "Romania",            flag: "🇷🇴", currency: "RON", locale: "ro-RO", timezone: "Europe/Bucharest",      taxName: "TVA",       defaultTaxRate: 19   },
  TR: { name: "Turkey",             flag: "🇹🇷", currency: "TRY", locale: "tr-TR", timezone: "Europe/Istanbul",       taxName: "KDV",       defaultTaxRate: 18   },

  // Middle East
  AE: { name: "UAE",                flag: "🇦🇪", currency: "AED", locale: "ar-AE", timezone: "Asia/Dubai",            taxName: "VAT",       defaultTaxRate: 5    },
  SA: { name: "Saudi Arabia",       flag: "🇸🇦", currency: "SAR", locale: "ar-SA", timezone: "Asia/Riyadh",           taxName: "VAT",       defaultTaxRate: 15   },
  QA: { name: "Qatar",              flag: "🇶🇦", currency: "QAR", locale: "ar-QA", timezone: "Asia/Qatar",            taxName: "VAT",       defaultTaxRate: 0    },
  KW: { name: "Kuwait",             flag: "🇰🇼", currency: "KWD", locale: "ar-KW", timezone: "Asia/Kuwait",           taxName: "VAT",       defaultTaxRate: 0    },
  BH: { name: "Bahrain",            flag: "🇧🇭", currency: "BHD", locale: "ar-BH", timezone: "Asia/Bahrain",          taxName: "VAT",       defaultTaxRate: 10   },
  OM: { name: "Oman",               flag: "🇴🇲", currency: "OMR", locale: "ar-OM", timezone: "Asia/Muscat",           taxName: "VAT",       defaultTaxRate: 5    },

  // South Asia
  PK: { name: "Pakistan",           flag: "🇵🇰", currency: "PKR", locale: "en-PK", timezone: "Asia/Karachi",          taxName: "GST",       defaultTaxRate: 17   },
  IN: { name: "India",              flag: "🇮🇳", currency: "INR", locale: "en-IN", timezone: "Asia/Kolkata",          taxName: "GST",       defaultTaxRate: 18   },
  BD: { name: "Bangladesh",         flag: "🇧🇩", currency: "BDT", locale: "bn-BD", timezone: "Asia/Dhaka",            taxName: "VAT",       defaultTaxRate: 15   },
  LK: { name: "Sri Lanka",          flag: "🇱🇰", currency: "LKR", locale: "en-LK", timezone: "Asia/Colombo",          taxName: "VAT",       defaultTaxRate: 15   },

  // Southeast & East Asia
  SG: { name: "Singapore",          flag: "🇸🇬", currency: "SGD", locale: "en-SG", timezone: "Asia/Singapore",        taxName: "GST",       defaultTaxRate: 9    },
  MY: { name: "Malaysia",           flag: "🇲🇾", currency: "MYR", locale: "ms-MY", timezone: "Asia/Kuala_Lumpur",     taxName: "SST",       defaultTaxRate: 6    },
  HK: { name: "Hong Kong",          flag: "🇭🇰", currency: "HKD", locale: "en-HK", timezone: "Asia/Hong_Kong",        taxName: "Tax",       defaultTaxRate: 0    },
  JP: { name: "Japan",              flag: "🇯🇵", currency: "JPY", locale: "ja-JP", timezone: "Asia/Tokyo",            taxName: "Consumption Tax", defaultTaxRate: 10 },
  KR: { name: "South Korea",        flag: "🇰🇷", currency: "KRW", locale: "ko-KR", timezone: "Asia/Seoul",            taxName: "VAT",       defaultTaxRate: 10   },
  CN: { name: "China",              flag: "🇨🇳", currency: "CNY", locale: "zh-CN", timezone: "Asia/Shanghai",         taxName: "VAT",       defaultTaxRate: 13   },
  PH: { name: "Philippines",        flag: "🇵🇭", currency: "PHP", locale: "en-PH", timezone: "Asia/Manila",           taxName: "VAT",       defaultTaxRate: 12   },
  ID: { name: "Indonesia",          flag: "🇮🇩", currency: "IDR", locale: "id-ID", timezone: "Asia/Jakarta",          taxName: "PPN",       defaultTaxRate: 11   },
  TH: { name: "Thailand",           flag: "🇹🇭", currency: "THB", locale: "th-TH", timezone: "Asia/Bangkok",          taxName: "VAT",       defaultTaxRate: 7    },

  // Oceania
  AU: { name: "Australia",          flag: "🇦🇺", currency: "AUD", locale: "en-AU", timezone: "Australia/Sydney",      taxName: "GST",       defaultTaxRate: 10   },
  NZ: { name: "New Zealand",        flag: "🇳🇿", currency: "NZD", locale: "en-NZ", timezone: "Pacific/Auckland",      taxName: "GST",       defaultTaxRate: 15   },

  // Africa
  ZA: { name: "South Africa",       flag: "🇿🇦", currency: "ZAR", locale: "en-ZA", timezone: "Africa/Johannesburg",   taxName: "VAT",       defaultTaxRate: 15   },
  NG: { name: "Nigeria",            flag: "🇳🇬", currency: "NGN", locale: "en-NG", timezone: "Africa/Lagos",          taxName: "VAT",       defaultTaxRate: 7.5  },
  KE: { name: "Kenya",              flag: "🇰🇪", currency: "KES", locale: "en-KE", timezone: "Africa/Nairobi",        taxName: "VAT",       defaultTaxRate: 16   },
  GH: { name: "Ghana",              flag: "🇬🇭", currency: "GHS", locale: "en-GH", timezone: "Africa/Accra",          taxName: "VAT",       defaultTaxRate: 15   },
  EG: { name: "Egypt",              flag: "🇪🇬", currency: "EGP", locale: "ar-EG", timezone: "Africa/Cairo",          taxName: "VAT",       defaultTaxRate: 14   },

  // Latin America
  BR: { name: "Brazil",             flag: "🇧🇷", currency: "BRL", locale: "pt-BR", timezone: "America/Sao_Paulo",     taxName: "ICMS",      defaultTaxRate: 17   },
  AR: { name: "Argentina",          flag: "🇦🇷", currency: "ARS", locale: "es-AR", timezone: "America/Argentina/Buenos_Aires", taxName: "IVA", defaultTaxRate: 21 },
  CO: { name: "Colombia",           flag: "🇨🇴", currency: "COP", locale: "es-CO", timezone: "America/Bogota",        taxName: "IVA",       defaultTaxRate: 19   },
  CL: { name: "Chile",              flag: "🇨🇱", currency: "CLP", locale: "es-CL", timezone: "America/Santiago",      taxName: "IVA",       defaultTaxRate: 19   },
};

export const COUNTRY_LIST = Object.entries(COUNTRIES)
  .map(([code, config]) => ({ code, ...config }))
  .sort((a, b) => a.name.localeCompare(b.name));
