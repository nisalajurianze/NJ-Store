/**
 * Navbar — category artwork SVGs, helper utilities, and class-name constants.
 *
 * Extracted from Navbar.tsx to reduce the component's cognitive load.
 * These are pure data/functions with zero React dependency.
 */
import type { CategoryDto } from '@njstore/types';

// ─── Utility helpers ─────────────────────────────────────────────────
export const buildMonogram = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const normalizeCategoryArtworkKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

const encodeSvgDataUri = (svg: string): string =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const fallbackArtworkDataUriCache = new Map<string, string>();

// ─── Generic fallback artwork ────────────────────────────────────────
const genericCategoryArtwork = (label: string): string => `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='280' y2='164' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#121722'/>
      <stop offset='1' stop-color='#060911'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(236 28) rotate(138.366) scale(98.1671 71.2197)'>
      <stop stop-color='#D4AF37' stop-opacity='.28'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(74 146) rotate(41.9872) scale(86.2849 61.2251)'>
      <stop stop-color='#3B82F6' stop-opacity='.22'/>
      <stop offset='1' stop-color='#3B82F6' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='248' cy='28' r='34' fill='url(#goldGlow)'/>
  <circle cx='56' cy='154' r='30' fill='url(#blueGlow)'/>
  <rect x='58' y='36' width='204' height='104' rx='28' fill='#0B1120' stroke='#DCE7FF' stroke-width='3'/>
  <rect x='94' y='74' width='132' height='4' rx='2' fill='#2C3548'/>
  <text x='160' y='120' text-anchor='middle' fill='#F4F7FF' font-size='24' font-family='Arial, sans-serif' font-weight='700'>
    ${label}
  </text>
</svg>`;

// ─── Per-category SVG artwork ────────────────────────────────────────
const categoryArtworkBySlug: Record<string, string> = {
  smartphones: `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 26) rotate(140) scale(92 68)'>
      <stop stop-color='#D4AF37' stop-opacity='.26'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(62 150) rotate(34) scale(88 64)'>
      <stop stop-color='#2F6DFF' stop-opacity='.24'/>
      <stop offset='1' stop-color='#2F6DFF' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='246' cy='24' r='32' fill='url(#goldGlow)'/>
  <circle cx='58' cy='152' r='31' fill='url(#blueGlow)'/>
  <rect x='94' y='16' width='10' height='148' rx='5' fill='#6E737A'/>
  <rect x='116' y='14' width='110' height='152' rx='28' fill='#1A2C53' stroke='#6CA0FF' stroke-width='4'/>
  <rect x='142' y='34' width='58' height='90' rx='13' fill='#0B1730'/>
  <circle cx='171' cy='142' r='5' fill='#32446A'/>
</svg>`,
  laptops: `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='26' y1='12' x2='286' y2='168' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#060911'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(246 30) rotate(141) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.26'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='246' cy='28' r='32' fill='url(#goldGlow)'/>
  <rect x='88' y='20' width='140' height='102' rx='16' fill='#2C3342'/>
  <rect x='94' y='24' width='128' height='94' rx='14' fill='#0F1E41' stroke='#5879BE' stroke-width='4'/>
  <rect x='116' y='40' width='84' height='48' rx='10' fill='#14244A'/>
  <rect x='70' y='128' width='180' height='24' rx='12' fill='#D3A52B'/>
  <rect x='84' y='130' width='152' height='10' rx='5' fill='#8B6616'/>
</svg>`,
  printers: `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(246 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='246' cy='28' r='32' fill='url(#goldGlow)'/>
  <rect x='126' y='8' width='68' height='42' rx='8' fill='#F1F5F9'/>
  <rect x='96' y='42' width='128' height='88' rx='20' fill='#1C2C4D' stroke='#607CB6' stroke-width='4'/>
  <rect x='126' y='78' width='68' height='16' rx='8' fill='#0F1A31'/>
  <rect x='104' y='126' width='112' height='40' rx='10' fill='#E2E8F0'/>
</svg>`,
  accessories: `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <rect x='96' y='14' width='54' height='90' rx='16' fill='#1B315B' stroke='#6A90D8' stroke-width='4'/>
  <path d='M176 18C220 18 246 48 246 92V124' stroke='#F3F6FB' stroke-width='14' stroke-linecap='round'/>
  <rect x='206' y='124' width='34' height='34' rx='8' fill='#D5A625'/>
  <rect x='138' y='18' width='12' height='28' rx='4' fill='#D5A625'/>
  <rect x='154' y='18' width='12' height='28' rx='4' fill='#D5A625'/>
</svg>`,
  audio: `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 30) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <path d='M112 130V88C112 48 136 20 160 20C184 20 208 48 208 88V130' stroke='#F2F6FB' stroke-width='16' stroke-linecap='round'/>
  <rect x='86' y='94' width='34' height='60' rx='16' fill='#193268'/>
  <rect x='200' y='94' width='34' height='60' rx='16' fill='#193268'/>
  <circle cx='160' cy='102' r='18' fill='#D3A52B'/>
  <circle cx='160' cy='102' r='11' fill='#112044'/>
</svg>`,
  tablets: `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(58 152) rotate(34) scale(88 64)'>
      <stop stop-color='#2F6DFF' stop-opacity='.2'/>
      <stop offset='1' stop-color='#2F6DFF' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <circle cx='58' cy='152' r='30' fill='url(#blueGlow)'/>
  <rect x='70' y='10' width='16' height='160' rx='8' fill='#6E737A'/>
  <rect x='86' y='12' width='148' height='156' rx='24' fill='#1A2C53' stroke='#6CA0FF' stroke-width='4'/>
  <rect x='112' y='30' width='96' height='108' rx='16' fill='#0F1D3D'/>
</svg>`,
  'smart-home': `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(58 152) rotate(34) scale(88 64)'>
      <stop stop-color='#2F6DFF' stop-opacity='.2'/>
      <stop offset='1' stop-color='#2F6DFF' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <circle cx='58' cy='152' r='30' fill='url(#blueGlow)'/>
  <path d='M98 94L160 34L222 94V150H98V94Z' fill='#20355E' stroke='#6A7D9F' stroke-width='4'/>
  <rect x='144' y='108' width='32' height='42' rx='8' fill='#101B32'/>
</svg>`,
  gaming: `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180' fill='none'>
  <defs>
    <linearGradient id='bg' x1='20' y1='16' x2='284' y2='162' gradientUnits='userSpaceOnUse'>
      <stop stop-color='#141923'/>
      <stop offset='1' stop-color='#050812'/>
    </linearGradient>
    <radialGradient id='goldGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(244 28) rotate(140) scale(88 66)'>
      <stop stop-color='#D4AF37' stop-opacity='.24'/>
      <stop offset='1' stop-color='#D4AF37' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='blueGlow' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(58 152) rotate(34) scale(88 64)'>
      <stop stop-color='#2F6DFF' stop-opacity='.2'/>
      <stop offset='1' stop-color='#2F6DFF' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='320' height='180' rx='26' fill='url(#bg)'/>
  <circle cx='244' cy='28' r='32' fill='url(#goldGlow)'/>
  <circle cx='58' cy='152' r='30' fill='url(#blueGlow)'/>
  <path d='M126 126H194C208 126 220 114 222 100L228 68C232 42 212 22 188 22H132C108 22 88 42 92 68L98 100C100 114 112 126 126 126Z' fill='#21345E' stroke='#647693' stroke-width='4'/>
  <rect x='120' y='72' width='14' height='36' rx='7' fill='#101B32'/>
  <rect x='108' y='84' width='38' height='12' rx='6' fill='#101B32'/>
  <circle cx='202' cy='76' r='10' fill='#D3A52B'/>
  <circle cx='228' cy='92' r='10' fill='#E7EDF8'/>
</svg>`
};

// ─── Artwork resolver ────────────────────────────────────────────────
export const getCategoryFallbackImage = (category: Pick<CategoryDto, 'slug' | 'name'>): string => {
  const categoryKey = normalizeCategoryArtworkKey(category.slug || category.name);
  const categoryLabel = category.name.trim() || 'Category';
  const cacheKey = `${categoryKey}:${categoryLabel}`;
  const cachedArtwork = fallbackArtworkDataUriCache.get(cacheKey);

  if (cachedArtwork) {
    return cachedArtwork;
  }

  const artwork = encodeSvgDataUri(categoryArtworkBySlug[categoryKey] ?? genericCategoryArtwork(categoryLabel));
  fallbackArtworkDataUriCache.set(cacheKey, artwork);
  return artwork;
};
