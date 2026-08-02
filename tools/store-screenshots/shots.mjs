/**
 * Shot definitions for the App Store screenshot set.
 * See appstore-screenshots/SCREENSHOT_PLAN.md §5 for the rationale.
 *
 * Layout fields (see template.mjs):
 *   kind: 'cover' | 'feature' | 'closer'
 *   patches          cosmetic text overlays in RAW capture px (identity only)
 * Feature frames render in the ink-poster grammar (same language as the
 * cover/closer): dark background, centered caption, framed phone rising
 * from the bottom. Retained alternates (bleed/fit/anchor/rot/chip/lift):
 * see template.mjs header.
 */

/** Design iteration. Bump when starting a new set; renders land in out/<VERSION>. */
export const VERSION = 'v1';

export const CANVAS = { width: 1284, height: 2778 };

/** Raw capture dimensions (iPhone 16 Plus simulator). */
export const CAPTURE = { width: 1290, height: 2796 };

export const TOKENS = {
  ink: '#101415',
  wash: '#EFF3F4',
  teal: '#069494',
  gray: '#5C6B6B',
};

export const SHOTS = [
  {
    id: '01-cover',
    kind: 'cover',
    capture: '01-dashboard.png',
    bigLight: 'Every booth.',
    bigBold: 'One app.',
    small: 'Booths · Alerts · Revenue · Templates',
  },
  {
    id: '02-dashboard',
    kind: 'feature',
    capture: '01-dashboard.png',
    big: 'Know how\n*today* is going',
    small: 'Live revenue across your fleet',
  },
  {
    id: '03-booths',
    kind: 'feature',
    capture: '02-booths.png',
    big: '*Every* booth,\nat a glance',
    small: 'Status, today’s takings, and controls for each unit',
  },
  {
    id: '04-alerts',
    kind: 'feature',
    capture: '05-alerts.png',
    big: 'Hear about\nproblems *first*',
    small: 'Printer errors, low paper, offline booths. On your phone',
  },
  {
    id: '05-analytics',
    kind: 'feature',
    capture: '03-analytics.png',
    big: 'See the *season*,\nnot just today',
    small: 'Daily to yearly trends, per booth or combined',
  },
  {
    id: '06-store',
    kind: 'feature',
    capture: '04-store.png',
    big: '*Fresh* looks for\nevery event',
    small: 'Browse templates and send them to your booth',
  },
  {
    id: '07-settings',
    kind: 'feature',
    capture: '06-settings.png',
    big: 'Your business,\nyour *brand*',
    small: 'Logo, branding, subscription, and booth licensing',
    // Cosmetic identity only: swap the dev account name + Gmail for the
    // demo brand. Never patch numbers/statuses (Guideline 2.3.3).
    patches: [
      { x: 388, y: 618, w: 610, h: 80, text: 'Sunset Booth Co.', fontSize: 64, weight: 600, color: '#11181C' },
      { x: 388, y: 700, w: 610, h: 66, text: 'demo@boothiq.com' },
    ],
  },
  {
    id: '08-closer',
    kind: 'closer',
    capture: '01-dashboard.png',
    capture2: '02-booths.png',
    big: 'Run the\nfleet right',
    small: 'boothiq.com',
  },
];
