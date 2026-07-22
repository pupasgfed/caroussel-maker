import type { ParseResult, ParsedSlide } from '../types';

const MAX_SLIDES = 10;

/**
 * Parse un bloc markdown en slides.
 * Règles (voir docs/guide-de-syntaxe.md) :
 *  - `---` seul sur une ligne = séparateur de slides.
 *  - `# Texte` = titre (concaténé si plusieurs, mais la 1re est le titre principal).
 *  - `> Texte` = accent (fusionné si plusieurs).
 *  - Toute autre ligne non vide = corps.
 */
export function parseMarkdown(raw: string): ParseResult {
  const segments = raw.split(/\n---\s*\n/);
  const totalDetected = segments.length;
  const truncated = totalDetected > MAX_SLIDES;
  const used = segments.slice(0, MAX_SLIDES);

  const slides: ParsedSlide[] = used.map((segment) => parseSegment(segment));
  return { slides, truncated, totalDetected };
}

function parseSegment(segment: string): ParsedSlide {
  const lines = segment.split('\n');
  const titleParts: string[] = [];
  const bodyParts: string[] = [];
  const accentParts: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (line.startsWith('# ')) {
      titleParts.push(line.slice(2).trim());
    } else if (line.startsWith('> ')) {
      accentParts.push(line.slice(2).trim());
    } else if (line.startsWith('#')) {
      // Lignes # sans espace: traiter comme titre quand même
      titleParts.push(line.slice(1).trim());
    } else if (line.startsWith('>')) {
      accentParts.push(line.slice(1).trim());
    } else {
      bodyParts.push(line);
    }
  }

  return {
    title: titleParts.join(' '),
    body: bodyParts.join('\n'),
    accent: accentParts.join(' '),
  };
}

/**
 * Slug à partir d'un titre : minuscules, sans accents, espaces → tirets.
 */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return slug || 'carrousel';
}
