import { Font } from '@react-pdf/renderer';

const CDN = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl';

const WW = '%5Bwdth%2Cwght%5D'; // [wdth,wght]
const W = '%5Bwght%5D';         // [wght]

// --- Base: Latin, Cyrillic, Greek, Devanagari, Vietnamese ---
Font.register({ family: 'Noto Sans', src: `${CDN}/notosans/NotoSans${WW}.ttf` });

// --- Arabic script (Arabic, Persian, Pashto, Urdu, Kurdish, Sindhi) ---
Font.register({ family: 'Noto Sans Arabic', src: `${CDN}/notosansarabic/NotoSansArabic${WW}.ttf` });

// --- CJK ---
Font.register({ family: 'Noto Sans SC', src: `${CDN}/notosanssc/NotoSansSC${W}.ttf` });
Font.register({ family: 'Noto Sans TC', src: `${CDN}/notosanstc/NotoSansTC${W}.ttf` });
Font.register({ family: 'Noto Sans JP', src: `${CDN}/notosansjp/NotoSansJP${W}.ttf` });
Font.register({ family: 'Noto Sans KR', src: `${CDN}/notosanskr/NotoSansKR${W}.ttf` });

// --- South Asian scripts ---
Font.register({ family: 'Noto Sans Bengali', src: `${CDN}/notosansbengali/NotoSansBengali${WW}.ttf` });
Font.register({ family: 'Noto Sans Tamil', src: `${CDN}/notosanstamil/NotoSansTamil${WW}.ttf` });
Font.register({ family: 'Noto Sans Telugu', src: `${CDN}/notosanstelugu/NotoSansTelugu${WW}.ttf` });
Font.register({ family: 'Noto Sans Kannada', src: `${CDN}/notosanskannada/NotoSansKannada${WW}.ttf` });
Font.register({ family: 'Noto Sans Malayalam', src: `${CDN}/notosansmalayalam/NotoSansMalayalam${WW}.ttf` });
Font.register({ family: 'Noto Sans Gujarati', src: `${CDN}/notosansgujarati/NotoSansGujarati${WW}.ttf` });
Font.register({ family: 'Noto Sans Gurmukhi', src: `${CDN}/notosansgurmukhi/NotoSansGurmukhi${WW}.ttf` });
Font.register({ family: 'Noto Sans Oriya', src: `${CDN}/notosansoriya/NotoSansOriya${WW}.ttf` });
Font.register({ family: 'Noto Sans Sinhala', src: `${CDN}/notosanssinhala/NotoSansSinhala${WW}.ttf` });
Font.register({ family: 'Noto Sans Devanagari', src: `${CDN}/notosansdevanagari/NotoSansDevanagari${WW}.ttf` });

// --- Southeast Asian scripts ---
Font.register({ family: 'Noto Sans Thai', src: `${CDN}/notosansthai/NotoSansThai${WW}.ttf` });
Font.register({ family: 'Noto Sans Lao', src: `${CDN}/notosanslao/NotoSansLao${WW}.ttf` });
Font.register({ family: 'Noto Sans Khmer', src: `${CDN}/notosanskhmer/NotoSansKhmer${WW}.ttf` });
Font.register({ family: 'Noto Sans Myanmar', src: `${CDN}/notosansmyanmar/NotoSansMyanmar${WW}.ttf` });

// --- Other scripts ---
Font.register({ family: 'Noto Sans Georgian', src: `${CDN}/notosansgeorgian/NotoSansGeorgian${WW}.ttf` });
Font.register({ family: 'Noto Sans Armenian', src: `${CDN}/notosansarmenian/NotoSansArmenian${WW}.ttf` });
Font.register({ family: 'Noto Sans Hebrew', src: `${CDN}/notosanshebrew/NotoSansHebrew${WW}.ttf` });
Font.register({ family: 'Noto Sans Ethiopic', src: `${CDN}/notosansethiopic/NotoSansEthiopic${WW}.ttf` });
Font.register({ family: 'Noto Sans Mongolian', src: `${CDN}/notosansmongolian/NotoSansMongolian-Regular.ttf` });

Font.registerHyphenationCallback((word) => [word]);

const LANG_FONT: Record<string, string> = {
  af: 'Noto Sans', sq: 'Noto Sans', az: 'Noto Sans', eu: 'Noto Sans',
  bs: 'Noto Sans', ca: 'Noto Sans', ceb: 'Noto Sans', co: 'Noto Sans',
  hr: 'Noto Sans', cs: 'Noto Sans', da: 'Noto Sans', nl: 'Noto Sans',
  en: 'Noto Sans', eo: 'Noto Sans', et: 'Noto Sans', tl: 'Noto Sans',
  fi: 'Noto Sans', fr: 'Noto Sans', fy: 'Noto Sans', gl: 'Noto Sans',
  de: 'Noto Sans', ht: 'Noto Sans', ha: 'Noto Sans', haw: 'Noto Sans',
  hmn: 'Noto Sans', hu: 'Noto Sans', is: 'Noto Sans', ig: 'Noto Sans',
  id: 'Noto Sans', ga: 'Noto Sans', it: 'Noto Sans', jw: 'Noto Sans',
  la: 'Noto Sans', lv: 'Noto Sans', lt: 'Noto Sans', lb: 'Noto Sans',
  mg: 'Noto Sans', ms: 'Noto Sans', mt: 'Noto Sans', mi: 'Noto Sans',
  no: 'Noto Sans', pl: 'Noto Sans', pt: 'Noto Sans', ro: 'Noto Sans',
  sm: 'Noto Sans', gd: 'Noto Sans', st: 'Noto Sans', sn: 'Noto Sans',
  sk: 'Noto Sans', sl: 'Noto Sans', so: 'Noto Sans', es: 'Noto Sans',
  su: 'Noto Sans', sw: 'Noto Sans', sv: 'Noto Sans', tr: 'Noto Sans',
  tk: 'Noto Sans', uz: 'Noto Sans', vi: 'Noto Sans', cy: 'Noto Sans',
  xh: 'Noto Sans', yo: 'Noto Sans', zu: 'Noto Sans', ny: 'Noto Sans',

  be: 'Noto Sans', bg: 'Noto Sans', kk: 'Noto Sans', ky: 'Noto Sans',
  mk: 'Noto Sans', mn: 'Noto Sans', ru: 'Noto Sans', sr: 'Noto Sans',
  tg: 'Noto Sans', uk: 'Noto Sans',

  el: 'Noto Sans',

  ar: 'Noto Sans Arabic', fa: 'Noto Sans Arabic', ps: 'Noto Sans Arabic',
  ku: 'Noto Sans Arabic', sd: 'Noto Sans Arabic', ur: 'Noto Sans Arabic',

  hi: 'Noto Sans Devanagari', mr: 'Noto Sans Devanagari', ne: 'Noto Sans Devanagari',

  bn: 'Noto Sans Bengali',

  zh: 'Noto Sans SC', 'zh-CN': 'Noto Sans SC', 'zh-TW': 'Noto Sans TC',
  ja: 'Noto Sans JP',
  ko: 'Noto Sans KR',

  ta: 'Noto Sans Tamil', te: 'Noto Sans Telugu', kn: 'Noto Sans Kannada',
  ml: 'Noto Sans Malayalam', gu: 'Noto Sans Gujarati', pa: 'Noto Sans Gurmukhi',
  or: 'Noto Sans Oriya', si: 'Noto Sans Sinhala',

  th: 'Noto Sans Thai', lo: 'Noto Sans Lao', km: 'Noto Sans Khmer',
  my: 'Noto Sans Myanmar',

  ka: 'Noto Sans Georgian', hy: 'Noto Sans Armenian',
  iw: 'Noto Sans Hebrew', he: 'Noto Sans Hebrew',
  am: 'Noto Sans Ethiopic',
};

export function getFontFamily(langCode: string): string {
  return LANG_FONT[langCode] || 'Noto Sans';
}
