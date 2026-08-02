/**
 * HTML template for one App Store screenshot canvas.
 *
 * CURRENT design (v4, full-bleed): feature frames use `bleed: true` — a
 * caption band in the app's own background color on top, the raw capture
 * filling the rest of the canvas edge-to-edge (Airbnb grammar). Cover and
 * closer are ink posters with framed phones. Optional per-shot fields:
 * `viewTop` (raw px to skip at the top of the capture), `bandH` (caption
 * band height; must be re-derived if viewTop changes), `patches` (cosmetic
 * identity text overlays in raw capture px).
 *
 * RETAINED alternative modes from earlier iterations (unused by v4 shots,
 * kept for future design passes): `chip` proof crops, `lift` (Cal-AI-style
 * in-place card raise), `anchor:'top'`, `fit:'full'`, tilted-phone bleed.
 *
 * All assets (fonts, captures, frame SVG) arrive as data URIs.
 * NOTE: esc() escapes content only (& < ") — interpolated strings are safe
 * as element text and double-quoted attribute values, nothing else.
 */
import { CANVAS, CAPTURE, TOKENS } from './shots.mjs';

/** Frame geometry of assets/apple-iphone.svg (screen inset within the SVG). */
const PHONE = { w: 1310, h: 2710, sx: 26, sy: 18, sw: 1258, sh: 2674, r: 212, padTop: 25 };

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const lines = (s) => esc(s).split('\n').join('<br>');
/** lines() + `*word*` → teal accent span (two-tone headlines). */
const richLines = (s) =>
  lines(s).replace(
    /\*([^*]+)\*/g,
    `<span style="color:${TOKENS.teal};">$1</span>`,
  );

/**
 * patches: cosmetic text replacements over the capture (e.g. swap a dev
 * email for the demo one) in RAW capture pixels. They scale with the phone
 * and sit under the frame overlay. The app UI uses Geist, so patched text
 * matches the surrounding type. Cosmetic identity fixes ONLY — never
 * numbers, statuses, or feature UI (Guideline 2.3.3).
 */
function patchHtml(patches, k) {
  if (!patches?.length) return '';
  const s = (PHONE.sw * k) / CAPTURE.width; // capture px → CSS px
  return patches
    .map((p) => {
      const fs = (p.fontSize ?? 46) * s;
      return `<div style="position:absolute;
        left:${(PHONE.sx * k + p.x * s).toFixed(1)}px; top:${((PHONE.sy + PHONE.padTop) * k + p.y * s).toFixed(1)}px;
        width:${(p.w * s).toFixed(1)}px; height:${(p.h * s).toFixed(1)}px;
        background:${p.bg ?? '#fff'}; color:${p.color ?? '#687076'};
        font-size:${fs.toFixed(1)}px; font-weight:${p.weight ?? 400};
        display:flex; align-items:center; overflow:hidden;">${esc(p.text ?? '')}</div>`;
    })
    .join('');
}

/** Full device: screen capture under the traced frame SVG, width w CSS px. */
function phoneHtml(assets, w, { capture = 'capture', patches } = {}) {
  const k = w / PHONE.w;
  const px = (n) => `${(n * k).toFixed(2)}px`;
  return `
  <div class="phone" style="width:${w}px; height:${px(PHONE.h)};">
    <div style="position:absolute; left:${px(PHONE.sx)}; top:${px(PHONE.sy)}; width:${px(PHONE.sw)}; height:${px(PHONE.sh)}; border-radius:${px(PHONE.r)}; background:${TOKENS.wash};"></div>
    <img src="${assets[capture]}" style="position:absolute; left:${px(PHONE.sx)}; top:${px(PHONE.sy + PHONE.padTop)}; width:${px(PHONE.sw)}; height:${px(PHONE.sh)}; border-radius:${px(PHONE.r)}; object-fit:cover; object-position:top;">
    ${patchHtml(patches, k)}
    <img src="${assets.frame}" style="position:absolute; inset:0; width:100%; height:100%;">
  </div>`;
}

/** Zoomed crop of the capture, floating with a white ring + deep shadow. */
function chipHtml(chip, assets) {
  const { crop, zoom } = chip;
  const w = crop.w * zoom;
  const h = crop.h * zoom;
  const pos = { left: 80, top: 1120, rotate: 4, ...chip.pos };
  return `<div class="chip" style="width:${w.toFixed(1)}px; height:${h.toFixed(1)}px; left:${pos.left}px; top:${pos.top}px; transform:rotate(${pos.rotate}deg);">
    <img src="${assets.capture}" style="position:absolute; width:${(CAPTURE.width * zoom).toFixed(1)}px; left:${(-crop.x * zoom).toFixed(1)}px; top:${(-crop.y * zoom).toFixed(1)}px;">
  </div>`;
}

/**
 * Giant ghosted app-icon mark for background depth (Pepmax technique: the
 * brand monogram, huge, at whisper opacity, sliced by the canvas edge).
 * The source glyph is white-on-transparency; brightness(0) tints it ink for
 * light frames.
 */
const markGhost = (assets, { dark = false } = {}) =>
  `<img src="${assets.mark}" style="position:absolute; right:-430px; top:430px;
    width:1500px; z-index:0; opacity:${dark ? 0.025 : 0.08};
    ${dark ? '' : 'filter:brightness(0);'}">`;

/** Soft radial glow — sits behind the phone so the frame never feels flat. */
const glow = (x, y, size, color) =>
  `<div style="position:absolute; left:${x}px; top:${y}px; width:${size}px; height:${size}px;
    border-radius:50%; z-index:0;
    background:radial-gradient(closest-side, ${color}, transparent 70%);"></div>`;

const wordmark = (size, color) =>
  `<span style="font-weight:600; font-size:${size}px; letter-spacing:-0.02em; color:${color};">Booth<span style="color:${TOKENS.teal};">IQ</span></span>`;

function coverHtml(shot, assets) {
  return `
  ${markGhost(assets, { dark: true })}
  <div class="cap center" style="padding-top:210px;">
    ${wordmark(64, '#fff')}
    <h1 style="font-weight:400; margin-top:120px;">${esc(shot.bigLight)}<br><b style="font-weight:600;">${esc(shot.bigBold)}</b></h1>
    <p style="letter-spacing:0.01em;">${esc(shot.small)}</p>
  </div>
  <div style="position:absolute; left:${((CANVAS.width - 1060) / 2).toFixed(0)}px; top:1430px; transform:rotate(-7deg); z-index:1;">
    ${phoneHtml(assets, 1060, { patches: shot.patches })}
  </div>`;
}

function closerHtml(shot, assets) {
  return `
  ${markGhost(assets, { dark: true })}
  <div class="cap center">
    ${wordmark(72, '#fff')}
    <h1 style="margin-top:90px;">${lines(shot.big)}</h1>
    <p>${esc(shot.small)}</p>
  </div>
  <div class="fan" style="left:-130px; transform:rotate(-10deg);">${phoneHtml(assets, 830, { capture: 'capture2' })}</div>
  <div class="fan" style="left:510px; top:1180px; transform:rotate(7deg);">${phoneHtml(assets, 870)}</div>`;
}

function featureHtml(shot, assets) {
  const rot = shot.rot ?? -8;
  const opts = { patches: shot.patches };

  // Default (v1 poster grammar): same visual language as the cover/closer —
  // ink background, centered two-tone caption, one upright fully-visible
  // phone, and floating feature badges overlapping its edges (LumaBooth
  // grammar; badges are design elements, never mocked UI).
  if (!shot.bleed && !shot.lift && !shot.anchor && !shot.fit && !shot.chip) {
    const w = shot.w ?? 990;
    const top = 700;
    return `
    ${glow((CANVAS.width - 2000) / 2, top - 120, 2000, 'rgba(6, 148, 148, 0.16)')}
    ${markGhost(assets)}
    <div class="cap center" style="padding-top:190px;">
      <h1>${richLines(shot.big)}</h1>
      <p>${esc(shot.small)}</p>
    </div>
    <div style="position:absolute; left:${((CANVAS.width - w) / 2).toFixed(0)}px; top:${top}px; z-index:1;">
      ${phoneHtml(assets, w, opts)}
    </div>`;
  }

  // Full-bleed layout (Airbnb grammar): no device frame. A caption band in
  // the app's own background color sits on top; the capture fills the rest
  // of the canvas edge-to-edge, cropped at the bottom. shot.viewTop (raw
  // capture px) starts the visible UI further down — e.g. to skip an
  // onboarding banner.
  if (shot.bleed) {
    const s = CANVAS.width / CAPTURE.width;
    const bandH = shot.bandH ?? 620;
    const viewTop = shot.viewTop ?? 0;
    const patchDivs = (shot.patches ?? [])
      .map((p) => {
        const fs = (p.fontSize ?? 46) * s;
        return `<div style="position:absolute; left:${(p.x * s).toFixed(1)}px; top:${((p.y - viewTop) * s).toFixed(1)}px;
          width:${(p.w * s).toFixed(1)}px; height:${(p.h * s).toFixed(1)}px;
          background:${p.bg ?? '#fff'}; color:${p.color ?? '#687076'};
          font-size:${fs.toFixed(1)}px; font-weight:${p.weight ?? 400};
          display:flex; align-items:center; overflow:hidden;">${esc(p.text ?? '')}</div>`;
      })
      .join('');
    return `
    <div class="cap">
      <div class="tick"></div>
      <h1 style="font-size:104px;">${lines(shot.big)}</h1>
      <p>${esc(shot.small)}</p>
    </div>
    <div style="position:absolute; left:0; right:0; top:${bandH}px; bottom:0; overflow:hidden; z-index:1;">
      <img src="${assets.capture}" style="position:absolute; left:0; top:${(-viewTop * s).toFixed(1)}px; width:${CANVAS.width}px;">
      ${patchDivs}
    </div>`;
  }

  // Lifted-card layout (Cal AI grammar): upright centered phone below a
  // short centered caption; the claimed UI card rises out of its own spot —
  // same position, scaled around its center, deep shadow. No duplication.
  if (shot.lift) {
    const w = shot.w ?? 1020;
    const left = (CANVAS.width - w) / 2;
    const top = shot.top ?? 640;
    const k = w / PHONE.w;
    const s = (PHONE.sw * k) / CAPTURE.width; // capture px → CSS px
    const { crop, scale } = shot.lift;
    const cw = crop.w * s * scale;
    const ch = crop.h * s * scale;
    const cx = left + PHONE.sx * k + crop.x * s - (crop.w * s * (scale - 1)) / 2;
    const cy = top + (PHONE.sy + PHONE.padTop) * k + crop.y * s - (crop.h * s * (scale - 1)) / 2;
    const z = s * scale; // capture px → CSS px inside the lifted card
    return `
    <div class="cap center" style="padding-top:150px;">
      <h1 style="font-size:104px;">${lines(shot.big)}</h1>
      ${shot.small ? `<p>${esc(shot.small)}</p>` : ''}
    </div>
    <div style="position:absolute; left:${left.toFixed(0)}px; top:${top}px; z-index:1;">${phoneHtml(assets, w, opts)}</div>
    <div class="lift" style="left:${cx.toFixed(1)}px; top:${cy.toFixed(1)}px; width:${cw.toFixed(1)}px; height:${ch.toFixed(1)}px;">
      <img src="${assets.capture}" style="position:absolute; width:${(CAPTURE.width * z).toFixed(1)}px; left:${(-crop.x * z).toFixed(1)}px; top:${(-crop.y * z).toFixed(1)}px;">
    </div>`;
  }
  const caption = `
  <div class="cap">
    <div class="tick"></div>
    <h1>${lines(shot.big)}</h1>
    <p>${esc(shot.small)}</p>
  </div>`;

  if (shot.anchor === 'top') {
    return `
    ${markGhost(assets)}
    <div style="position:absolute; left:120px; top:-830px; transform:rotate(${rot}deg); z-index:1;">${phoneHtml(assets, 1245, opts)}</div>
    <div class="cap" style="position:absolute; left:0; right:0; bottom:200px; padding-top:0;">
      <div class="tick"></div>
      <h1>${lines(shot.big)}</h1>
      <p>${esc(shot.small)}</p>
    </div>`;
  }

  let hero;
  if (shot.fit === 'full') {
    const w = shot.w ?? 950;
    const h = (w * PHONE.h) / PHONE.w;
    const top = 640 + (CANVAS.height - 640 - h) / 2;
    hero = `<div style="position:absolute; left:${((CANVAS.width - w) / 2).toFixed(0)}px; top:${top.toFixed(0)}px; transform:${rot ? `rotate(${rot}deg)` : 'none'}; z-index:1;">${phoneHtml(assets, w, opts)}</div>`;
  } else {
    hero = `<div style="position:absolute; left:300px; top:900px; transform:rotate(${rot}deg); z-index:1;">${phoneHtml(assets, 1245, opts)}</div>`;
  }
  const chip = shot.chip ? chipHtml(shot.chip, assets) : '';
  return `${markGhost(assets)}${caption}${hero}${chip}`;
}

export function renderHtml(shot, assets) {
  // v1 grammar: dark ink bookends (cover + closer), light feature frames
  // sharing the same poster composition.
  const poster = shot.kind === 'cover' || shot.kind === 'closer';
  // Never flat: light frames get a gentle teal-tinted diagonal wash, dark
  // frames a faint center lift.
  const bg = poster
    ? `radial-gradient(1400px at 50% 26%, #1A2626 0%, ${TOKENS.ink} 62%)`
    : `linear-gradient(168deg, #E8F0F0 0%, #F3F6F6 44%, #E4EDED 100%)`;
  const ink = poster ? '#FFFFFF' : TOKENS.ink;
  const sub = poster ? 'rgba(196, 216, 216, 0.92)' : TOKENS.gray;

  const body =
    shot.kind === 'cover'
      ? coverHtml(shot, assets)
      : shot.kind === 'closer'
        ? closerHtml(shot, assets)
        : featureHtml(shot, assets);

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'Geist'; font-weight: 400; src: url(${assets.fonts.regular}) format('truetype'); }
  @font-face { font-family: 'Geist'; font-weight: 500; src: url(${assets.fonts.medium}) format('truetype'); }
  @font-face { font-family: 'Geist'; font-weight: 600; src: url(${assets.fonts.semibold}) format('truetype'); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${CANVAS.width}px; height: ${CANVAS.height}px; overflow: hidden; }
  body { background: ${bg}; font-family: 'Geist', sans-serif; position: relative; }
  .cap { padding: 150px 104px 0; position: relative; z-index: 2; }
  .cap.center { text-align: center; padding-top: 190px; }
  .tick { width: 64px; height: 10px; border-radius: 5px; background: ${TOKENS.teal}; margin-bottom: 44px; }
  h1 { font-size: 116px; line-height: 1.06; letter-spacing: -0.025em; font-weight: 600; color: ${ink}; }
  p { font-size: 46px; line-height: 1.4; font-weight: 400; color: ${sub}; margin-top: 36px; max-width: 1000px; }
  .cap.center p { margin-left: auto; margin-right: auto; }
  .phone { position: relative; filter: drop-shadow(0 50px 90px rgba(10, 24, 24, 0.32)); }
  .fan { position: absolute; top: 1240px; z-index: 1; filter: drop-shadow(0 40px 80px rgba(0, 0, 0, 0.45)); }
  .fan .phone { filter: none; }
  .chip { position: absolute; overflow: hidden; border-radius: 40px; z-index: 3; background: #fff;
          box-shadow: 0 50px 110px rgba(10, 24, 24, 0.38), 0 0 0 2px rgba(255, 255, 255, 0.9); }
  .lift { position: absolute; overflow: hidden; border-radius: 34px; z-index: 3; background: #fff;
          box-shadow: 0 60px 120px rgba(10, 24, 24, 0.35), 0 12px 32px rgba(10, 24, 24, 0.16); }
  </style></head><body>${body}</body></html>`;
}
