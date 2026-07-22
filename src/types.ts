export type SlideFormat = 'carrousel' | 'story';
export type ExportFormat = 'jpg' | 'webp';
export type TemplateId = 'outline' | 'underlay' | 'minimal' | 'collage' | 'bulles' | 'cartes' | 'fiche' | 'liste';

export interface ParsedSlide {
  title: string;
  body: string;
  accent: string;
}

export interface Background {
  type: 'color' | 'image';
  color: string;
  image: string | null;
}

export interface CanvasDimensions {
  width: number;
  height: number;
  marginTop: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;
}

export interface ParseResult {
  slides: ParsedSlide[];
  truncated: boolean;
  totalDetected: number;
}

export const DEFAULT_BACKGROUND: Background = {
  type: 'color',
  color: '#323347',
  image: null,
};

export const FORMATS: Record<SlideFormat, CanvasDimensions> = {
  carrousel: { width: 1080, height: 1350, marginTop: 250, marginLeft: 250, marginRight: 250, marginBottom: 450 },
  story: { width: 1080, height: 1920, marginTop: 250, marginLeft: 250, marginRight: 250, marginBottom: 450 },
};

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  outline: 'Outline blanc',
  underlay: 'Underlay couleur',
  minimal: 'Minimal centré',
  collage: 'Collage rotatif',
  bulles: 'Bulles story',
  cartes: 'Cartes empilées',
  fiche: 'Fiche fond',
  liste: 'Liste structurée',
};
