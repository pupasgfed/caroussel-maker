import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Image as ImageIcon, Trash2, Layers, FileImage, AlertTriangle } from 'lucide-react';
import {
  DEFAULT_BACKGROUND,
  FORMATS,
  TEMPLATE_LABELS,
  type Background,
  type ExportFormat,
  type ParsedSlide,
  type SlideFormat,
  type TemplateId,
} from './types';
import { parseMarkdown, slugify } from './lib/parser';
import { loadImage, renderSlide } from './lib/render';

const SAMPLE_MARKDOWN = `# Ton esprit sait déjà
Le corps suit toujours ce que l'esprit répète.
> LE DÉCLIC : répète-le 3 fois ce soir.
---
# Slide 2
Deuxième slide, corps de texte.
> Autre accent.`;

const FONT_NAMES = ['"League Spartan"', '"Nunito Sans"', '"Madimi One"'];

export default function CarrouselMaker() {
  const [format, setFormat] = useState<SlideFormat>('carrousel');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('jpg');
  const [rawMarkdown, setRawMarkdown] = useState(SAMPLE_MARKDOWN);
  const [debouncedMarkdown, setDebouncedMarkdown] = useState(SAMPLE_MARKDOWN);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [templates, setTemplates] = useState<TemplateId[]>([]);
  const [fontsReady, setFontsReady] = useState(false);
  const [imageCache, setImageCache] = useState<Map<string, HTMLImageElement | null>>(new Map());
  const [isExporting, setIsExporting] = useState(false);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // Debounce markdown parsing (~300ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedMarkdown(rawMarkdown), 300);
    return () => clearTimeout(t);
  }, [rawMarkdown]);

  // Parse slides.
  const { slides, truncated, totalDetected } = useMemo(() => parseMarkdown(debouncedMarkdown), [debouncedMarkdown]);

  // Sync backgrounds array length with slides count.
  useEffect(() => {
    setBackgrounds((prev) => {
      const next = [...prev];
      while (next.length < slides.length) next.push({ ...DEFAULT_BACKGROUND });
      next.length = slides.length;
      return next;
    });
  }, [slides.length]);

  // Sync templates array length with slides count (default "outline").
  useEffect(() => {
    setTemplates((prev) => {
      const next = [...prev];
      while (next.length < slides.length) next.push('outline');
      next.length = slides.length;
      return next;
    });
  }, [slides.length]);

  // Load Google Fonts then signal ready (avoids flash of fallback font on first canvas render).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all(FONT_NAMES.map((f) => document.fonts.load(`16px ${f}`)));
        await document.fonts.ready;
      } catch {
        // ignore — canvas will use fallback fonts
      }
      if (!cancelled) setFontsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load background images as dataURLs → HTMLImageElement (cached).
  useEffect(() => {
    const entries = backgrounds.filter((b) => b.type === 'image' && b.image);
    if (entries.length === 0) {
      setImageCache(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const cache = new Map<string, HTMLImageElement | null>();
      for (const b of entries) {
        if (b.image && !cache.has(b.image)) {
          const img = await loadImage(b.image);
          cache.set(b.image, img);
        }
      }
      if (!cancelled) setImageCache(cache);
    })();
    return () => {
      cancelled = true;
    };
  }, [backgrounds]);

  // Redraw all canvases on any relevant change.
  useEffect(() => {
    if (!fontsReady) return;
    const dims = FORMATS[format];
    slides.forEach((slide, i) => {
      const canvas = canvasRefs.current.get(i);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const bg = backgrounds[i] || DEFAULT_BACKGROUND;
      const tpl = templates[i] || 'outline';
      const bgImg = bg.type === 'image' && bg.image ? imageCache.get(bg.image) || null : null;
      renderSlide(ctx, slide, bg, tpl, dims, bgImg);
    });
  }, [slides, backgrounds, templates, format, fontsReady, imageCache]);

  const handleBackgroundChange = (index: number, patch: Partial<Background>) => {
    setBackgrounds((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = { ...DEFAULT_BACKGROUND };
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleImageUpload = (index: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleBackgroundChange(index, { type: 'image', image: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    handleBackgroundChange(index, { type: 'color', image: null });
  };

  const handleTemplateChange = (index: number, tpl: TemplateId) => {
    setTemplates((prev) => {
      const next = [...prev];
      next[index] = tpl;
      return next;
    });
  };

  const exportSlide = useCallback(
    (index: number, filename: string): Promise<void> => {
      return new Promise((resolve) => {
        const canvas = canvasRefs.current.get(index);
        if (!canvas) {
          resolve();
          return;
        }
        const mime = exportFormat === 'webp' ? 'image/webp' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else if (exportFormat === 'webp') {
              // Fallback silencieux vers jpg si webp non supporté.
              canvas.toBlob(
                (jpgBlob) => {
                  if (jpgBlob) {
                    const url = URL.createObjectURL(jpgBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename.replace(/\.webp$/, '.jpg');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }
                  resolve();
                },
                'image/jpeg',
                0.92,
              );
              return;
            }
            resolve();
          },
          mime,
          0.92,
        );
      });
    },
    [exportFormat],
  );

  const handleExportAll = async () => {
    if (slides.length === 0 || isExporting) return;
    setIsExporting(true);
    const baseSlug = slugify(slides[0].title || 'carrousel');
    const ext = exportFormat;
    for (let i = 0; i < slides.length; i++) {
      const num = String(i + 1).padStart(2, '0');
      await exportSlide(i, `${baseSlug}-${num}.${ext}`);
      if (i < slides.length - 1) await delay(300);
    }
    setIsExporting(false);
  };

  const dims = FORMATS[format];
  const gridMinWidth = format === 'carrousel' ? 260 : 210;

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 gap-6">
      <Header />
      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        <ControlPanel
          format={format}
          exportFormat={exportFormat}
          rawMarkdown={rawMarkdown}
          truncated={truncated}
          totalDetected={totalDetected}
          slidesCount={slides.length}
          onFormatChange={setFormat}
          onExportFormatChange={setExportFormat}
          onMarkdownChange={setRawMarkdown}
        />
        <PreviewPanel
          slides={slides}
          backgrounds={backgrounds}
          templates={templates}
          dims={dims}
          gridMinWidth={gridMinWidth}
          canvasRefs={canvasRefs}
          onBackgroundChange={handleBackgroundChange}
          onImageUpload={handleImageUpload}
          onRemoveImage={removeImage}
          onTemplateChange={handleTemplateChange}
        />
      </div>
      <ExportBar slidesCount={slides.length} onExport={handleExportAll} isExporting={isExporting} />
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function Header() {
  return (
    <header className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-12 bg-app-accent flex items-center justify-center text-app-base shadow-lg">
        <Layers size={22} strokeWidth={2.5} />
      </div>
      <div>
        <h1 className="font-spartan text-2xl font-extrabold tracking-tight leading-none">Carrousel Maker</h1>
        <p className="text-sm text-white/60 mt-1">Créez des carrousels et stories Instagram, 100% côté client.</p>
      </div>
    </header>
  );
}

interface ControlPanelProps {
  format: SlideFormat;
  exportFormat: ExportFormat;
  rawMarkdown: string;
  truncated: boolean;
  totalDetected: number;
  slidesCount: number;
  onFormatChange: (f: SlideFormat) => void;
  onExportFormatChange: (f: ExportFormat) => void;
  onMarkdownChange: (s: string) => void;
}

function ControlPanel(props: ControlPanelProps) {
  return (
    <aside className="w-full lg:w-[40%] flex flex-col gap-5">
      <Card>
        <h2 className="font-spartan text-lg font-bold mb-1">Carrousel Maker</h2>
        <p className="text-sm text-white/60 mb-4">Configurez votre format, puis rédigez votre contenu.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Format">
            <Select value={props.format} onChange={(v) => props.onFormatChange(v as SlideFormat)}>
              <option value="carrousel">Carrousel — 1080×1350</option>
              <option value="story">Story — 1080×1920</option>
            </Select>
          </Field>
          <Field label="Export">
            <Select value={props.exportFormat} onChange={(v) => props.onExportFormatChange(v as ExportFormat)}>
              <option value="jpg">.jpg</option>
              <option value="webp">.webp</option>
            </Select>
          </Field>
        </div>
        <p className="text-xs text-white/45 mt-3 italic">Le template se choisit slide par slide, sous chaque image.</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-spartan text-lg font-bold">Contenu</h2>
          <span className="text-xs text-white/50 tabular-nums">{props.slidesCount} slide{props.slidesCount > 1 ? 's' : ''}</span>
        </div>
        <textarea
          value={props.rawMarkdown}
          onChange={(e) => props.onMarkdownChange(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full bg-app-base/40 border border-white/10 rounded-12 px-4 py-3 text-sm font-nunito text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-app-accent/60 resize-y leading-relaxed"
          placeholder="# Mon titre&#10;Mon corps de texte&#10;> Mon accent&#10;---&#10;# Slide 2"
        />
        {props.truncated && (
          <div className="flex items-center gap-2 mt-3 text-xs text-amber-300 bg-amber-300/10 border border-amber-300/20 rounded-lg px-3 py-2">
            <AlertTriangle size={14} />
            <span>{props.totalDetected} slides détectées — seules les 10 premières sont utilisées.</span>
          </div>
        )}
      </Card>
    </aside>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-app-panel rounded-12 p-5 shadow-lg">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-app-base/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-app-accent/60 cursor-pointer"
    >
      {children}
    </select>
  );
}

interface PreviewPanelProps {
  slides: ParsedSlide[];
  backgrounds: Background[];
  templates: TemplateId[];
  dims: typeof FORMATS[SlideFormat];
  gridMinWidth: number;
  canvasRefs: React.MutableRefObject<Map<number, HTMLCanvasElement>>;
  onBackgroundChange: (index: number, patch: Partial<Background>) => void;
  onImageUpload: (index: number, file: File | undefined) => void;
  onRemoveImage: (index: number) => void;
  onTemplateChange: (index: number, tpl: TemplateId) => void;
}

function PreviewPanel(props: PreviewPanelProps) {
  return (
    <section className="flex-1 flex flex-col gap-4">
      <h2 className="font-spartan text-lg font-bold">Prévisualisation</h2>
      {props.slides.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-app-panel/50 rounded-12 border border-dashed border-white/15">
          <div className="text-center text-white/40">
            <FileImage size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune slide. Ajoutez du contenu dans la zone de saisie.</p>
          </div>
        </div>
      ) : (
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${props.gridMinWidth}px, 1fr))` }}
        >
          {props.slides.map((slide, i) => (
            <SlideCard
              key={i}
              index={i}
              slide={slide}
              background={props.backgrounds[i] || DEFAULT_BACKGROUND}
              template={props.templates[i] || 'outline'}
              dims={props.dims}
              canvasRefs={props.canvasRefs}
              onBackgroundChange={props.onBackgroundChange}
              onImageUpload={props.onImageUpload}
              onRemoveImage={props.onRemoveImage}
              onTemplateChange={props.onTemplateChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface SlideCardProps {
  index: number;
  slide: ParsedSlide;
  background: Background;
  template: TemplateId;
  dims: typeof FORMATS[SlideFormat];
  canvasRefs: React.MutableRefObject<Map<number, HTMLCanvasElement>>;
  onBackgroundChange: (index: number, patch: Partial<Background>) => void;
  onImageUpload: (index: number, file: File | undefined) => void;
  onRemoveImage: (index: number) => void;
  onTemplateChange: (index: number, tpl: TemplateId) => void;
}

function SlideCard(props: SlideCardProps) {
  const { index, slide, background, template, dims, canvasRefs } = props;
  const fileInputId = `img-input-${index}`;
  const colorValue = background.type === 'color' ? background.color : '#323347';

  return (
    <div className="bg-app-panel rounded-12 p-3 flex flex-col gap-3 shadow-lg">
      <canvas
        ref={(el) => {
          if (el) canvasRefs.current.set(index, el);
        }}
        width={dims.width}
        height={dims.height}
        className="carousel-canvas bg-app-base"
      />
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-white/80">Slide {index + 1}</span>
        {slide.title && <span className="text-xs text-white/40 truncate ml-2 max-w-[60%]">{slide.title}</span>}
      </div>

      <BackgroundControl
        index={index}
        background={background}
        colorValue={colorValue}
        fileInputId={fileInputId}
        onBackgroundChange={props.onBackgroundChange}
        onImageUpload={props.onImageUpload}
        onRemoveImage={props.onRemoveImage}
      />

      <Field label="Template">
        <Select value={template} onChange={(v) => props.onTemplateChange(index, v as TemplateId)}>
          {(Object.keys(TEMPLATE_LABELS) as TemplateId[]).map((id) => (
            <option key={id} value={id}>
              {TEMPLATE_LABELS[id]}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

interface BackgroundControlProps {
  index: number;
  background: Background;
  colorValue: string;
  fileInputId: string;
  onBackgroundChange: (index: number, patch: Partial<Background>) => void;
  onImageUpload: (index: number, file: File | undefined) => void;
  onRemoveImage: (index: number) => void;
}

function BackgroundControl(props: BackgroundControlProps) {
  const { index, background, colorValue, fileInputId } = props;

  if (background.type === 'image' && background.image) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={background.image}
          alt="Fond"
          className="w-12 h-12 object-cover rounded-lg border border-white/15 flex-shrink-0"
        />
        <button
          onClick={() => props.onRemoveImage(index)}
          className="flex items-center gap-1.5 text-xs text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors"
        >
          <Trash2 size={14} />
          Retirer
        </button>
        <label
          htmlFor={fileInputId}
          className="flex items-center gap-1.5 text-xs text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors cursor-pointer ml-auto"
        >
          <ImageIcon size={14} />
          Changer
        </label>
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => props.onImageUpload(index, e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={colorValue}
        onChange={(e) => props.onBackgroundChange(index, { type: 'color', color: e.target.value })}
        className="w-10 h-10 rounded-lg flex-shrink-0"
        title="Couleur de fond"
      />
      <input
        type="text"
        value={colorValue}
        onChange={(e) => props.onBackgroundChange(index, { type: 'color', color: e.target.value })}
        className="w-24 bg-app-base/60 border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-app-accent/60"
        maxLength={7}
      />
      <label
        htmlFor={fileInputId}
        className="flex items-center gap-1.5 text-xs text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors cursor-pointer ml-auto"
      >
        <ImageIcon size={14} />
        Image
      </label>
      <input
        id={fileInputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => props.onImageUpload(index, e.target.files?.[0])}
      />
    </div>
  );
}

interface ExportBarProps {
  slidesCount: number;
  onExport: () => void;
  isExporting: boolean;
}

function ExportBar(props: ExportBarProps) {
  const disabled = props.slidesCount === 0 || props.isExporting;
  return (
    <div className="w-full flex justify-center pt-2">
      <button
        onClick={props.onExport}
        disabled={disabled}
        className="flex items-center gap-2.5 bg-app-accent text-app-base font-spartan font-bold text-base px-8 py-4 rounded-12 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
      >
        <Download size={20} strokeWidth={2.5} />
        {props.isExporting ? 'Export en cours…' : `Exporter tout (${props.slidesCount} slide${props.slidesCount > 1 ? 's' : ''})`}
      </button>
    </div>
  );
}
