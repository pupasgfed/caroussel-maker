import type { Background, CanvasDimensions, ParsedSlide, TemplateId } from '../types';
import { computeLayout, wrapText, type TextBlock } from './layout';

const FONT_FAMILY_TITLE = '"League Spartan", system-ui, sans-serif';
// Nunito Sans substitue "SN Pro" (indisponible sur Google Fonts) dans le rendu canvas.
const FONT_FAMILY_BODY = '"Nunito Sans", system-ui, sans-serif';
const FONT_FAMILY_ACCENT = '"Madimi One", system-ui, sans-serif';

const COLOR_TITLE_OUTLINE = '#161616';
const COLOR_DARK = '#323347';
const COLOR_WHITE = '#ffffff';
const COLOR_ACCENT = '#aaa8f8';
const YELLOW_HIGHLIGHT = '#FFE234';

const SIZE_TITLE = 98;
const SIZE_BODY = 68;
const SIZE_ACCENT = 72;
const LINE_HEIGHT_TITLE = 1.1;
const LINE_HEIGHT_BODY = 1.35;
const LINE_HEIGHT_ACCENT = 1.2;
const MIN_TITLE = 48;
const MIN_BODY = 42;
const MIN_ACCENT = 44;
const GAP = 40;
const MAX_SHRINK_ITERATIONS = 6;
const STICKER_RADIUS_RATIO = 0.42;
const STICKER_PADDING_X = 32;
const STICKER_PADDING_Y = 18;
const STICKER_OVERLAP = 0.12;

interface RenderConfig {
  titleSize: number;
  bodySize: number;
  accentSize: number;
}

interface RenderResult {
  config: RenderConfig;
}

/**
 * Charge une image dataURL. Retourne null si le chargement échoue (fallback couleur).
 */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Point d'entrée principal : dessine une slide complète sur un contexte canvas.
 */
export function renderSlide(
  ctx: CanvasRenderingContext2D,
  slide: ParsedSlide,
  background: Background,
  template: TemplateId,
  dims: CanvasDimensions,
  bgImage: HTMLImageElement | null,
): RenderResult {
  const centered = template === 'minimal';
  const contentWidth = dims.width - dims.marginLeft - dims.marginRight;
  const contentHeight = dims.height - dims.marginTop - dims.marginBottom;

  drawBackground(ctx, background, template, dims, bgImage);

  let config: RenderConfig = { titleSize: SIZE_TITLE, bodySize: SIZE_BODY, accentSize: SIZE_ACCENT };

  for (let i = 0; i < MAX_SHRINK_ITERATIONS; i++) {
    const { titleBlock, bodyBlock, accentBlock, layout } = measureLayout(
      ctx,
      slide,
      config,
      contentWidth,
      contentHeight,
      centered,
      template,
    );

    if (fitsIn(titleBlock, bodyBlock, accentBlock, layout, contentHeight)) {
      break;
    }

    const next = shrinkConfig(config, slide);
    if (next.titleSize === config.titleSize && next.bodySize === config.bodySize && next.accentSize === config.accentSize) {
      break;
    }
    config = next;
  }

  const { layout } = measureLayout(
    ctx,
    slide,
    config,
    contentWidth,
    contentHeight,
    centered,
    template,
  );

  const contentX = dims.marginLeft;
  drawTitle(ctx, slide.title, template, config.titleSize, contentX, dims.marginTop + layout.titleY, contentWidth, centered);
  drawBody(ctx, slide.body, template, config.bodySize, contentX, dims.marginTop + layout.bodyY, contentWidth, centered);
  drawAccent(ctx, slide.accent, template, config.accentSize, contentX, dims.marginTop + layout.accentY, contentWidth, centered);

  return { config };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: Background,
  template: TemplateId,
  dims: CanvasDimensions,
  bgImage: HTMLImageElement | null,
) {
  const { width, height } = dims;
  ctx.clearRect(0, 0, width, height);

  if (background.type === 'image' && bgImage) {
    drawImageCover(ctx, bgImage, width, height);
    const needsOverlay = template === 'outline' || template === 'underlay' || template === 'minimal' || template === 'fiche' || template === 'liste';
    if (needsOverlay) {
      const overlayAlpha = template === 'minimal' ? 0.4 : (template === 'fiche' || template === 'liste') ? 0.15 : 0.25;
      ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = background.color || COLOR_DARK;
    ctx.fillRect(0, 0, width, height);
    if (template === 'minimal') {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, width, height);
    }
  }
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;
  let drawW: number;
  let drawH: number;
  if (imgRatio > canvasRatio) {
    drawH = h;
    drawW = h * imgRatio;
  } else {
    drawW = w;
    drawH = w / imgRatio;
  }
  const dx = (w - drawW) / 2;
  const dy = (h - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

function measureLayout(
  ctx: CanvasRenderingContext2D,
  slide: ParsedSlide,
  config: RenderConfig,
  contentWidth: number,
  contentHeight: number,
  centered: boolean,
  template: TemplateId,
) {
  const wrapWidths = getWrapWidths(template, contentWidth);

  ctx.font = `800 ${config.titleSize}px ${FONT_FAMILY_TITLE}`;
  const titleBlock = wrapText(ctx, slide.title, wrapWidths.title, config.titleSize * LINE_HEIGHT_TITLE);

  ctx.font = `700 ${config.bodySize}px ${FONT_FAMILY_BODY}`;
  const bodyBlock = wrapText(ctx, slide.body, wrapWidths.body, config.bodySize * LINE_HEIGHT_BODY);

  ctx.font = `${config.accentSize}px ${FONT_FAMILY_ACCENT}`;
  const accentBlock = wrapText(ctx, slide.accent, wrapWidths.accent, config.accentSize * LINE_HEIGHT_ACCENT);

  const padding = getBlockPadding(template);
  titleBlock.totalHeight += padding.title;
  bodyBlock.totalHeight += padding.body;
  accentBlock.totalHeight += padding.accent;

  const layout = computeLayout({
    titleBlock,
    bodyBlock,
    accentBlock,
    contentWidth,
    contentHeight,
    gap: GAP,
    centered,
  });

  return { titleBlock, bodyBlock, accentBlock, layout };
}

function getWrapWidths(template: TemplateId, contentWidth: number): { title: number; body: number; accent: number } {
  const titlePadding: Record<string, number> = { collage: 64, bulles: 72, cartes: 56, fiche: 64, liste: 56 };
  const bodyPadding: Record<string, number> = { collage: 64, bulles: 64, cartes: 56, fiche: 56, liste: 56 };
  const accentPadding: Record<string, number> = { collage: 56, bulles: 56, cartes: 56, fiche: 48 };
  return {
    title: Math.max(80, contentWidth - (titlePadding[template] ?? 0)),
    body: Math.max(80, contentWidth - (bodyPadding[template] ?? 0)),
    accent: Math.max(80, contentWidth - (accentPadding[template] ?? 0)),
  };
}

function fitsIn(
  titleBlock: TextBlock,
  bodyBlock: TextBlock,
  accentBlock: TextBlock,
  layout: { titleY: number; bodyY: number; accentY: number },
  contentHeight: number,
): boolean {
  const bottomAccent = layout.accentY + accentBlock.totalHeight;
  const bottomBody = layout.bodyY + bodyBlock.totalHeight;
  const bottomTitle = layout.titleY + titleBlock.totalHeight;
  const maxBottom = Math.max(bottomAccent, bottomBody, bottomTitle);
  return maxBottom <= contentHeight;
}

function shrinkConfig(config: RenderConfig, slide: ParsedSlide): RenderConfig {
  const factor = 0.9;
  return {
    titleSize: slide.title ? Math.max(MIN_TITLE, Math.round(config.titleSize * factor)) : config.titleSize,
    bodySize: slide.body ? Math.max(MIN_BODY, Math.round(config.bodySize * factor)) : config.bodySize,
    accentSize: slide.accent ? Math.max(MIN_ACCENT, Math.round(config.accentSize * factor)) : config.accentSize,
  };
}

// ============ TITRE ============

function drawTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  template: TemplateId,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
  centered: boolean,
) {
  if (!text) return;
  ctx.font = `800 ${size}px ${FONT_FAMILY_TITLE}`;
  ctx.textBaseline = 'top';
  const block = wrapText(ctx, text, getWrapWidths(template, maxWidth).title, size * LINE_HEIGHT_TITLE);

  if (template === 'outline') {
    drawStickerTitle(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'underlay') {
    drawUnderlayTitle(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'collage') {
    drawCollageTitle(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'bulles') {
    drawBullesTitle(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'cartes') {
    drawCartesTitle(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'fiche') {
    drawFicheTitle(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'liste') {
    drawListeTitle(ctx, block, x, y, size, centered, maxWidth);
  } else {
    drawMinimalTitle(ctx, block, x, y, size, centered, maxWidth);
  }
}

/**
 * Template « Outline blanc » : sticker blanc arrondi par ligne.
 * 1er passage : dessine tous les fonds. 2e passage : dessine tout le texte.
 * Les fonds de lignes consécutives se chevauchent légèrement (effet nuage).
 */
function drawStickerTitle(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_TITLE;
  const paddingX = STICKER_PADDING_X;
  const paddingY = STICKER_PADDING_Y;
  const radius = (lineHeight + paddingY * 2) * STICKER_RADIUS_RATIO;
  const overlap = lineHeight * STICKER_OVERLAP;

  // Alignement horizontal du sticker : centré sur le texte, pas sur maxWidth.
  const align = centered ? 'center' : 'left';

  // 1er passage : fonds
  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    let stickerX = x;
    if (align === 'center') {
      stickerX = x + (maxWidth - line.width) / 2 - paddingX;
    }
    const stickerY = lineY - paddingY + (i > 0 ? overlap : 0);
    const stickerW = line.width + paddingX * 2;
    const stickerH = lineHeight + paddingY * 2 - (i > 0 ? overlap : 0);

    // Ombre portée derrière le sticker
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = COLOR_WHITE;
    roundRect(ctx, stickerX, stickerY, stickerW, stickerH, radius);
    ctx.fill();
    ctx.restore();
  });

  // 2e passage : texte noir par-dessus
  ctx.fillStyle = COLOR_TITLE_OUTLINE;
  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    let textX = x;
    if (align === 'center') {
      textX = x + (maxWidth - line.width) / 2;
    }
    ctx.fillText(line.text, textX, lineY);
  });
}

/**
 * Template « Underlay couleur » : bandeau accent par ligne, texte foncé par-dessus.
 */
function drawUnderlayTitle(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_TITLE;
  const bandPaddingX = 28;
  const bandPaddingY = 8;

  const align = centered ? 'center' : 'left';

  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    let bandX = x;
    if (align === 'center') {
      bandX = x + (maxWidth - line.width) / 2 - bandPaddingX;
    }
    const bandY = lineY - bandPaddingY;
    const bandW = line.width + bandPaddingX * 2;
    const bandH = lineHeight + bandPaddingY * 2;

    ctx.fillStyle = COLOR_ACCENT;
    ctx.fillRect(bandX, bandY, bandW, bandH);

    ctx.fillStyle = COLOR_DARK;
    let textX = x;
    if (align === 'center') {
      textX = x + (maxWidth - line.width) / 2;
    }
    ctx.fillText(line.text, textX, lineY);
  });
}

/**
 * Template « Minimal centré » : texte blanc + ombre portée douce, pas de fond.
 */
function drawMinimalTitle(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_TITLE;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = COLOR_WHITE;

  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    let textX = x;
    if (centered) {
      textX = x + (maxWidth - line.width) / 2;
    }
    ctx.fillText(line.text, textX, lineY);
  });
  ctx.restore();
}

// ============ CORPS ============

function drawBody(
  ctx: CanvasRenderingContext2D,
  text: string,
  template: TemplateId,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
  centered: boolean,
) {
  if (!text) return;
  if (template === 'collage') {
    drawCollageBody(ctx, text, size, x, y, maxWidth);
    return;
  }
  if (template === 'bulles') {
    drawBullesBody(ctx, text, size, x, y, maxWidth);
    return;
  }
  if (template === 'cartes') {
    drawCartesBody(ctx, text, size, x, y, maxWidth);
    return;
  }
  if (template === 'fiche') {
    drawFicheBody(ctx, text, size, x, y, maxWidth);
    return;
  }
  if (template === 'liste') {
    drawListeBody(ctx, text, size, x, y, maxWidth);
    return;
  }
  const weight = template === 'minimal' ? '400' : '700';
  ctx.font = `${weight} ${size}px ${FONT_FAMILY_BODY}`;
  ctx.textBaseline = 'top';
  const block = wrapText(ctx, text, maxWidth, size * LINE_HEIGHT_BODY);

  const shadowAlpha = template === 'minimal' ? 0.5 : 0.8;
  const shadowBlur = template === 'minimal' ? 6 : 10;
  const shadowOffsetY = template === 'minimal' ? 1 : 3;

  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${shadowAlpha})`;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowOffsetY;
  ctx.fillStyle = COLOR_WHITE;

  block.lines.forEach((line, i) => {
    const lineY = y + i * size * LINE_HEIGHT_BODY;
    let textX = x;
    if (centered) {
      textX = x + (maxWidth - line.width) / 2;
    }
    ctx.fillText(line.text, textX, lineY);
  });
  ctx.restore();
}

// ============ ACCENT ============

function drawAccent(
  ctx: CanvasRenderingContext2D,
  text: string,
  template: TemplateId,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
  centered: boolean,
) {
  if (!text) return;
  ctx.font = `${size}px ${FONT_FAMILY_ACCENT}`;
  ctx.textBaseline = 'top';
  const block = wrapText(ctx, text, getWrapWidths(template, maxWidth).accent, size * LINE_HEIGHT_ACCENT);

  if (template === 'underlay') {
    drawUnderlayAccent(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'collage') {
    drawCollageAccent(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'bulles') {
    drawBullesAccent(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'cartes') {
    drawCartesAccent(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'fiche') {
    drawFicheAccent(ctx, block, x, y, size, centered, maxWidth);
  } else if (template === 'liste') {
    drawListeAccent(ctx, block, x, y, size, centered, maxWidth);
  } else {
    drawStrokedAccent(ctx, block, x, y, size, centered, maxWidth);
  }
}

function drawUnderlayAccent(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_ACCENT;
  const bandPaddingX = 24;
  const bandPaddingY = 6;

  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    let bandX = x;
    if (centered) {
      bandX = x + (maxWidth - line.width) / 2 - bandPaddingX;
    }
    const bandY = lineY - bandPaddingY;
    const bandW = line.width + bandPaddingX * 2;
    const bandH = lineHeight + bandPaddingY * 2;

    ctx.fillStyle = COLOR_ACCENT;
    ctx.fillRect(bandX, bandY, bandW, bandH);

    ctx.fillStyle = COLOR_DARK;
    let textX = x;
    if (centered) {
      textX = x + (maxWidth - line.width) / 2;
    }
    ctx.fillText(line.text, textX, lineY);
  });
}

function drawStrokedAccent(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_ACCENT;
  ctx.save();
  ctx.fillStyle = COLOR_ACCENT;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    let textX = x;
    if (centered) {
      textX = x + (maxWidth - line.width) / 2;
    }
    ctx.strokeText(line.text, textX, lineY);
    ctx.fillText(line.text, textX, lineY);
  });
  ctx.restore();
}

// ============ COLLAGE ROTATIF ============

/**
 * Template « Collage rotatif » : stickers blancs rotés par ligne, bandeau foncé pour le corps,
 * bandeau accent roté pour l'accent. Effet journal découpé.
 */
function drawCollageTitle(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_TITLE;
  const paddingX = STICKER_PADDING_X;
  const paddingY = STICKER_PADDING_Y;
  const radius = (lineHeight + paddingY * 2) * STICKER_RADIUS_RATIO;
  const angles = [-4, 3, -2, 5, -3];
  const align = centered ? 'center' : 'left';

  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    let stickerX = x;
    if (align === 'center') stickerX = x + (maxWidth - line.width) / 2 - paddingX;
    const stickerY = lineY - paddingY;
    const stickerW = line.width + paddingX * 2;
    const stickerH = lineHeight + paddingY * 2;
    const angle = (angles[i % angles.length] * Math.PI) / 180;
    const cx = stickerX + stickerW / 2;
    const cy = stickerY + stickerH / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = COLOR_WHITE;
    roundRect(ctx, stickerX, stickerY, stickerW, stickerH, radius);
    ctx.fill();
    ctx.restore();
  });

  ctx.fillStyle = COLOR_TITLE_OUTLINE;
  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    let stickerX = x;
    if (align === 'center') stickerX = x + (maxWidth - line.width) / 2 - paddingX;
    const stickerW = line.width + paddingX * 2;
    const angle = (angles[i % angles.length] * Math.PI) / 180;
    const cx = stickerX + stickerW / 2;
    const cy = lineY - paddingY + (lineHeight + paddingY * 2) / 2;
    let textX = x;
    if (align === 'center') textX = x + (maxWidth - line.width) / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    ctx.fillText(line.text, textX, lineY);
    ctx.restore();
  });
}

function drawCollageBody(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
) {
  ctx.font = `700 ${size}px ${FONT_FAMILY_BODY}`;
  ctx.textBaseline = 'top';
  const paddingX = 32;
  const paddingY = 16;
  const block = wrapText(ctx, text, getWrapWidths('collage', maxWidth).body, size * LINE_HEIGHT_BODY);

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x, y - paddingY, maxWidth, block.totalHeight + paddingY * 2);

  ctx.fillStyle = COLOR_WHITE;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * size * LINE_HEIGHT_BODY);
  });
}

function drawCollageAccent(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  _centered: boolean,
  _maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_ACCENT;
  const paddingX = 28;
  const paddingY = 10;
  const angle = (3 * Math.PI) / 180;

  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    const bandX = x;
    const bandY = lineY - paddingY;
    const bandW = line.width + paddingX * 2;
    const bandH = lineHeight + paddingY * 2;
    const cx = bandX + bandW / 2;
    const cy = bandY + bandH / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = COLOR_ACCENT;
    ctx.fillRect(bandX, bandY, bandW, bandH);
    ctx.fillStyle = COLOR_DARK;
    ctx.fillText(line.text, x + paddingX, lineY);
    ctx.restore();
  });
}

// ============ BULLES STORY ============

/**
 * Template « Bulles story » : bulles blanches arrondies (style messagerie).
 * Titre et corps dans des bulles blanches, accent dans une bulle couleur accent.
 */
function drawBullesTitle(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  _centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_TITLE;
  const paddingX = 36;
  const paddingY = 24;
  const radius = 32;
  const bubbleW = Math.min(block.maxWidth + paddingX * 2, maxWidth);
  const bubbleH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = COLOR_WHITE;
  roundRect(ctx, x, y - paddingY, bubbleW, bubbleH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = COLOR_TITLE_OUTLINE;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * lineHeight);
  });
}

function drawBullesBody(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
) {
  ctx.font = `700 ${size}px ${FONT_FAMILY_BODY}`;
  ctx.textBaseline = 'top';
  const block = wrapText(ctx, text, getWrapWidths('bulles', maxWidth).body, size * LINE_HEIGHT_BODY);
  const paddingX = 32;
  const paddingY = 20;
  const radius = 28;
  const bubbleW = Math.min(block.maxWidth + paddingX * 2, maxWidth);
  const bubbleH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = COLOR_WHITE;
  roundRect(ctx, x, y - paddingY, bubbleW, bubbleH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = COLOR_TITLE_OUTLINE;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * size * LINE_HEIGHT_BODY);
  });
}

function drawBullesAccent(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  _centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_ACCENT;
  const paddingX = 28;
  const paddingY = 14;
  const radius = 24;
  const bubbleW = Math.min(block.maxWidth + paddingX * 2, maxWidth);
  const bubbleH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = COLOR_WHITE;
  roundRect(ctx, x, y - paddingY, bubbleW, bubbleH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = COLOR_TITLE_OUTLINE;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * lineHeight);
  });
}

// ============ CARTES EMPILEES ============

/**
 * Template « Cartes empilées » : cartes blanches plates sur photo, carte accent foncée rotée.
 * Style éditorial minimaliste avec ombres portées marquées.
 */
function drawCartesTitle(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  _centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_TITLE;
  const paddingX = 28;
  const paddingY = 20;
  const radius = 12;
  const cardH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = COLOR_WHITE;
  roundRect(ctx, x, y - paddingY, maxWidth, cardH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = COLOR_DARK;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * lineHeight);
  });
}

function drawCartesBody(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
) {
  ctx.font = `700 ${size}px ${FONT_FAMILY_BODY}`;
  ctx.textBaseline = 'top';
  const block = wrapText(ctx, text, getWrapWidths('cartes', maxWidth).body, size * LINE_HEIGHT_BODY);
  const paddingX = 28;
  const paddingY = 18;
  const radius = 12;
  const cardH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = COLOR_WHITE;
  roundRect(ctx, x, y - paddingY, maxWidth, cardH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = COLOR_DARK;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * size * LINE_HEIGHT_BODY);
  });
}

function drawCartesAccent(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  _centered: boolean,
  _maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_ACCENT;
  const paddingX = 28;
  const paddingY = 14;
  const radius = 12;
  const angle = (4 * Math.PI) / 180;
  const cardW = block.maxWidth + paddingX * 2;
  const cardH = block.totalHeight + paddingY * 2;
  const cx = x + cardW / 2;
  const cy = y - paddingY + cardH / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.translate(-cx, -cy);
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = COLOR_WHITE;
  roundRect(ctx, x, y - paddingY, cardW, cardH, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = COLOR_TITLE_OUTLINE;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * lineHeight);
  });
  ctx.restore();
}

// ============ FICHE FOND ============

/**
 * Template « Fiche fond » : carte blanche à bords arrondis avec bordure accent gauche.
 * Corps dans une carte semi-transparente. Accent en pastille couleur accent.
 */
function drawFicheTitle(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  _centered: boolean,
  maxWidth: number,
) {
  const paddingX = 28;
  const paddingY = 20;
  const radius = 14;
  const lineHeight = size * LINE_HEIGHT_TITLE;
  const cardH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = COLOR_WHITE;
  roundRect(ctx, x, y - paddingY, maxWidth, cardH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = COLOR_ACCENT;
  roundRect(ctx, x, y - paddingY, 8, cardH, 4);
  ctx.fill();

  ctx.fillStyle = COLOR_DARK;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX + 8, y + i * lineHeight);
  });
}

function drawFicheBody(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
) {
  ctx.font = `700 ${size}px ${FONT_FAMILY_BODY}`;
  ctx.textBaseline = 'top';
  const block = wrapText(ctx, text, getWrapWidths('fiche', maxWidth).body, size * LINE_HEIGHT_BODY);
  const paddingX = 28;
  const paddingY = 18;
  const radius = 14;
  const cardH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  roundRect(ctx, x, y - paddingY, maxWidth, cardH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = COLOR_DARK;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * size * LINE_HEIGHT_BODY);
  });
}

function drawFicheAccent(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  _centered: boolean,
  maxWidth: number,
) {
  const lineHeight = size * LINE_HEIGHT_ACCENT;
  const paddingX = 24;
  const paddingY = 10;
  const radius = 10;
  const pillW = Math.min(block.maxWidth + paddingX * 2, maxWidth);
  const pillH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = COLOR_ACCENT;
  roundRect(ctx, x, y - paddingY, pillW, pillH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = COLOR_DARK;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * lineHeight);
  });
}

// ============ LISTE STRUCTURÉE ============

/**
 * Template « Liste structurée » : titre en surlignage jaune dans une carte blanche,
 * corps en texte régulier dans une carte blanche, accent stroked.
 */
function drawListeTitle(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  _centered: boolean,
  maxWidth: number,
) {
  const paddingX = 28;
  const paddingY = 20;
  const radius = 14;
  const lineHeight = size * LINE_HEIGHT_TITLE;
  const cardH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = COLOR_WHITE;
  roundRect(ctx, x, y - paddingY, maxWidth, cardH, radius);
  ctx.fill();
  ctx.restore();

  const hPadX = 6;
  const hPadY = 5;
  block.lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    ctx.fillStyle = YELLOW_HIGHLIGHT;
    ctx.fillRect(
      x + paddingX - hPadX,
      lineY - hPadY,
      line.width + hPadX * 2,
      size * LINE_HEIGHT_TITLE + hPadY * 2,
    );
  });

  ctx.fillStyle = COLOR_TITLE_OUTLINE;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * lineHeight);
  });
}

function drawListeBody(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
) {
  ctx.font = `400 ${size}px ${FONT_FAMILY_BODY}`;
  ctx.textBaseline = 'top';
  const block = wrapText(ctx, text, getWrapWidths('liste', maxWidth).body, size * LINE_HEIGHT_BODY);
  const paddingX = 28;
  const paddingY = 18;
  const radius = 14;
  const cardH = block.totalHeight + paddingY * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = COLOR_WHITE;
  roundRect(ctx, x, y - paddingY, maxWidth, cardH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = COLOR_DARK;
  block.lines.forEach((line, i) => {
    ctx.fillText(line.text, x + paddingX, y + i * size * LINE_HEIGHT_BODY);
  });
}

function drawListeAccent(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  x: number,
  y: number,
  size: number,
  centered: boolean,
  maxWidth: number,
) {
  drawStrokedAccent(ctx, block, x, y, size, centered, maxWidth);
}

// ============ PADDING HELPER ============

function getBlockPadding(template: TemplateId): { title: number; body: number; accent: number } {
  switch (template) {
    case 'collage':
      return { title: STICKER_PADDING_Y * 2, body: 32, accent: 20 };
    case 'bulles':
      return { title: 48, body: 40, accent: 28 };
    case 'cartes':
      return { title: 40, body: 36, accent: 28 };
    case 'fiche':
      return { title: 40, body: 36, accent: 20 };
    case 'liste':
      return { title: 40, body: 36, accent: 0 };
    default:
      return { title: 0, body: 0, accent: 0 };
  }
}

// ============ UTIL ============

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
