/**
 * Moteur de layout pour le rendu canvas.
 * Mesure manuelle avec measureText (jamais de wrap CSS).
 */

export interface WrappedLine {
  text: string;
  width: number;
  height: number;
}

export interface TextBlock {
  lines: WrappedLine[];
  totalHeight: number;
  maxWidth: number;
}

export interface LayoutInput {
  titleBlock: TextBlock;
  bodyBlock: TextBlock;
  accentBlock: TextBlock;
  contentWidth: number;
  contentHeight: number;
  gap: number;
  centered: boolean;
}

export interface LayoutResult {
  titleY: number;
  bodyY: number;
  accentY: number;
}

/**
 * Découpe un texte en lignes qui tiennent dans maxWidth.
 * Gère les paragraphes (sauts de ligne explicites) puis le wrap par mot.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number,
): TextBlock {
  if (!text) {
    return { lines: [], totalHeight: 0, maxWidth: 0 };
  }

  const lines: WrappedLine[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      // Ligne vide = spacer
      lines.push({ text: '', width: 0, height: lineHeight });
      continue;
    }

    let current = '';
    let currentWidth = 0;

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const testWidth = ctx.measureText(test).width;

      if (testWidth <= maxWidth || !current) {
        current = test;
        currentWidth = testWidth;
      } else {
        lines.push({ text: current, width: currentWidth, height: lineHeight });
        current = word;
        currentWidth = ctx.measureText(word).width;
      }
    }
    if (current) {
      lines.push({ text: current, width: currentWidth, height: lineHeight });
    }
  }

  const totalHeight = lines.length > 0 ? lines.length * lineHeight : 0;
  const blockMaxWidth = lines.reduce((m, l) => Math.max(m, l.width), 0);
  return { lines, totalHeight, maxWidth: blockMaxWidth };
}

/**
 * Calcule la position Y de départ de chaque bloc.
 *  - Templates non-centrés : titre en haut, accent en bas, corps centré entre les deux.
 *  - Minimal centré : les 3 blocs groupés et centrés verticalement.
 */
export function computeLayout(input: LayoutInput): LayoutResult {
  const { titleBlock, bodyBlock, accentBlock, contentHeight, gap, centered } = input;

  if (centered) {
    const totalH =
      titleBlock.totalHeight +
      (titleBlock.lines.length && bodyBlock.lines.length ? gap : 0) +
      bodyBlock.totalHeight +
      (bodyBlock.lines.length && accentBlock.lines.length ? gap : 0) +
      accentBlock.totalHeight;
    const startY = Math.max(0, (contentHeight - totalH) / 2);

    let cursor = startY;
    const titleY = cursor;
    cursor += titleBlock.totalHeight;
    if (titleBlock.lines.length && bodyBlock.lines.length) cursor += gap;
    const bodyY = cursor;
    cursor += bodyBlock.totalHeight;
    if (bodyBlock.lines.length && accentBlock.lines.length) cursor += gap;
    const accentY = cursor;
    return { titleY, bodyY, accentY };
  }

  // Non-centré : titre ancré en haut, accent ancré en bas, corps centré entre les deux.
  const titleY = 0;
  const accentY = contentHeight - accentBlock.totalHeight;

  const remainingTop = titleY + titleBlock.totalHeight + (titleBlock.lines.length ? gap : 0);
  const remainingBottom = accentY - (accentBlock.lines.length ? gap : 0);
  const remainingSpace = Math.max(0, remainingBottom - remainingTop);
  const bodyY = remainingTop + Math.max(0, (remainingSpace - bodyBlock.totalHeight) / 2);

  return { titleY, bodyY, accentY };
}
