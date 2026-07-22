# Carrousel Maker — dossier complet pour un outil "vibe coding"

Ce document contient tout ce qu'il faut coller dans un outil de type Bolt.new, v0, Cursor, Replit Agent ou Claude Code pour qu'il reconstruise l'outil **Carrousel Maker** en tant que **projet Vite autonome**, prêt à être déployé sur **GitHub Pages**, sans aucun appel API.

Il y a trois parties :
1. Le prompt maître à coller tel quel dans l'outil de génération.
2. Les instructions de déploiement GitHub Pages.
3. Une liste de pièges et de conseils pour éviter les erreurs classiques des outils "vibe coding" sur ce genre de projet.

---

## 1. Prompt maître à coller

```
Crée un projet Vite + React + Tailwind CSS complet, prêt à être déployé sur GitHub Pages,
qui implémente un outil appelé « Carrousel Maker ». Interface entièrement en français.
Aucun appel API, aucune dépendance à un backend : tout doit fonctionner 100% côté client,
en local ou une fois hébergé sur des pages statiques.

STACK ET STRUCTURE DU PROJET
- Vite + React (JavaScript, pas TypeScript).
- Tailwind CSS configuré (classes core uniquement, pas de valeurs arbitraires exotiques ;
  les couleurs custom passent par des styles inline, pas par des classes Tailwind arbitraires).
- Un seul composant principal : src/CarrouselMaker.jsx, monté dans src/App.jsx.
- vite.config.js doit exposer une option `base` facilement modifiable (ex: base: '/NOM_DU_REPO/')
  pour un déploiement GitHub Pages sur un repo qui n'est pas un site racine username.github.io.
- Aucune dépendance externe autre que react, react-dom, tailwindcss, postcss, autoprefixer.
  Pas de librairie de composants, pas de UI kit.

CHARTE GRAPHIQUE
- Fond principal : #323347
- Fond secondaire (panneaux, cartes) : #4a4b65
- Boutons d'action / accents : #aaa8f8 (texte foncé #323347 dessus)
- Texte : #ffffff
- Coins arrondis 12px partout, espacements généreux, design sombre et épuré.

FONTS (Google Fonts, chargées via un <link> injecté dans <head> au montage du composant,
plus un préchargement via document.fonts.load()/document.fonts.ready avant le premier rendu
canvas pour éviter un flash avec une police de secours) :
- League Spartan, poids 700 et 800 → titres des slides (rendu à 800 dans le canvas).
- Nunito Sans, poids 400, 600 et 700 → corps de texte (substitut de "SN Pro", indisponible
  sur Google Fonts — mentionner cette substitution en commentaire dans le code).
  Poids 400 sur le template "Minimal centré", poids 700 (gras) sur "Outline blanc" et
  "Underlay couleur".
- Madimi One → texte accent.
- L'interface de l'outil (hors canvas) utilise aussi Nunito Sans.

DISPOSITION GÉNÉRALE
- Conteneur principal en colonne (flex-col), pleine hauteur, padding généreux.
- Première rangée en flex-row sur desktop (flex-col sur mobile) contenant :
  - Panneau de contrôle à gauche (~40% de largeur sur desktop).
  - Panneau de prévisualisation à droite (~60% de largeur sur desktop).
- Sous cette rangée, tout en bas de l'outil (donc après la prévisualisation, pas dans le
  panneau de gauche) : une barre pleine largeur avec un unique bouton d'export.

PANNEAU DE CONTRÔLE (gauche)
Carte 1 :
- Titre « Carrousel Maker » (police League Spartan) + sous-titre.
- Deux menus déroulants côte à côte :
  - Format : « Carrousel — 1080×1350 » ou « Story — 1080×1920 » (on génère l'un OU l'autre,
    jamais les deux en même temps).
  - Export : « .jpg » (qualité 0.92) ou « .webp » (qualité 0.92).
- Une petite note : « Le template se choisit slide par slide, sous chaque image. »
  (Il n'y a PAS de sélecteur de template global — voir plus bas, le template est choisi
  individuellement pour chaque slide, dans le panneau de droite.)

Carte 2 :
- Une textarea markdown unique (environ 12 lignes visibles), pré-remplie au chargement avec :

  # Ton esprit sait déjà
  Le corps suit toujours ce que l'esprit répète.
  > LE DÉCLIC : répète-le 3 fois ce soir.
  ---
  # Slide 2
  Deuxième slide, corps de texte.
  > Autre accent.

- Syntaxe markdown à parser :
  - `---` seul sur une ligne = séparateur de slides.
  - `# Texte` = titre du slide (peut y en avoir plusieurs lignes, elles sont concaténées).
  - `> Texte` = ligne d'accent.
  - Toute autre ligne non vide = corps de texte.
- Parsing robuste : un slide peut n'avoir ni titre, ni corps, ni accent. Maximum 10 slides ;
  si plus de 10 séparateurs sont détectés, tronquer à 10 et afficher un avertissement discret
  du type « X slides détectées — seules les 10 premières sont utilisées. »
- Le nombre de slides est entièrement déduit du markdown (debounce ~300ms sur la saisie
  avant de re-parser, pour ne pas re-render à chaque frappe).

PANNEAU DE PRÉVISUALISATION (droite)
- Titre « Prévisualisation ».
- Une grille responsive (`repeat(auto-fill, minmax(Wpx, 1fr))`, W ≈ 260px pour le format
  carrousel et ≈ 210px pour le format story) de cartes, une par slide détectée. Pour chaque
  slide, dans cet ordre vertical :
  1. Un `<canvas>` de prévisualisation (échelle CSS réduite via `width: 100%; height: auto`,
     mais résolution réelle du canvas = 1080×1350 ou 1080×1920 selon le format choisi, pour
     un export pixel-perfect).
  2. Le libellé « Slide N ».
  3. Le bloc de choix de fond, directement sous l'image :
     - Si un fond image est défini : miniature (thumbnail) + bouton « Retirer ».
     - Sinon : un input `type="color"` + un champ texte hex, tous deux liés au même état,
       valeur par défaut `#323347`.
     - Dans tous les cas, un bouton/label « Image » avec un input file caché (`accept="image/*"`)
       qui lit le fichier via FileReader → dataURL (l'image n'est jamais uploadée nulle part).
  4. Juste en dessous de ce bloc fond, un menu déroulant de template **propre à cette slide**,
     avec les 3 options : « Outline blanc », « Underlay couleur », « Minimal centré ». Chaque
     slide a son propre état de template (par défaut "outline" pour toutes — donc si on ne
     touche à rien, toutes les slides ont le même template, mais chacune peut être changée
     individuellement).
- Il n'y a AUCUN bouton d'export individuel par slide dans cette grille.

BARRE D'EXPORT (bas de l'outil, pleine largeur, après la prévisualisation)
- Un unique bouton « ⬇ Exporter tout (N slides) » qui exporte toutes les slides à la suite,
  avec un délai d'environ 300ms entre chaque téléchargement (pour éviter que le navigateur
  ne bloque les téléchargements multiples).
- Nommage des fichiers exportés : slug du titre de la première slide (minuscules, sans
  accents, espaces remplacés par des tirets) + numéro à 2 chiffres, ex :
  `ton-esprit-sait-deja-01.jpg`, `ton-esprit-sait-deja-02.jpg`. Si aucun titre, utiliser
  `carrousel` comme base.
- Export via `canvas.toBlob()` avec le bon type MIME (`image/jpeg` ou `image/webp`) et la
  qualité 0.92.

RENDU CANVAS (le cœur du système, à implémenter précisément)
- Dimensions réelles du canvas : 1080×1350 (carrousel) ou 1080×1920 (story).
- Marges de sécurité : au moins 250px sur les bords haut, gauche et droite ; 450px en bas
  (pour laisser de la place à l'UI Instagram — pagination, avatar, légende…). Aucun texte
  ne doit dépasser cette zone de contenu.
- Alignement du texte principal :
  - Centré (horizontalement et verticalement, bloc titre+corps+accent groupé et centré
    dans la zone de contenu) pour le template « Minimal centré ».
  - Aligné à gauche pour « Outline blanc » et « Underlay couleur » (le bloc de texte
    commence au bord gauche de la zone de contenu, mais reste dans les marges de 250px).
- Fond de chaque slide :
  - Image importée : recadrée en mode "cover" (remplit tout le canvas, centrée, rognée si
    besoin) avec un assombrissement (overlay noir) de 25% d'opacité — ou 40% pour le
    template « Minimal centré », qui a besoin de plus de contraste.
  - Couleur unie : pas d'overlay supplémentaire (sauf un léger voile ~15% en plus sur
    « Minimal centré » pour rester cohérent visuellement).
- Titre (League Spartan, poids 800) :
  - Taille de départ 98px, wrap automatique (mesure manuelle avec `measureText`, pas de
    wrap CSS), interlignage serré (×1.1).
  - Template « Outline blanc » : chaque ligne du titre est peinte sur un fond blanc en
    forme de "sticker" (rectangle très arrondi, rayon ≈ 42% de la hauteur du bloc), avec
    une légère ombre portée derrière le sticker. Le texte du titre est noir (#161616),
    gras. Les fonds de toutes les lignes sont dessinés d'abord (premier passage), puis
    tout le texte est dessiné par-dessus (second passage) — indispensable car les fonds
    de lignes consécutives se chevauchent légèrement pour créer un effet "nuage" continu,
    et il ne faut jamais qu'un fond de ligne postérieure rogne les jambages (g, j, p, y)
    de la ligne précédente.
  - Template « Underlay couleur » : chaque ligne du titre a un bandeau plein de couleur
    accent (#aaa8f8) derrière elle (un bandeau par ligne, pas un rectangle unique pour tout
    le bloc), avec le texte en couleur foncée (#323347) par-dessus.
  - Template « Minimal centré » : pas de fond derrière le titre, texte blanc avec une ombre
    portée douce (noir, ~60% d'opacité, blur ~10px) pour rester lisible sur la photo.
  - Auto-réduction : si le bloc titre+corps+accent dépasse la hauteur disponible, réduire
    itérativement les 3 tailles de police (jusqu'à ~6 itérations), en respectant des
    minimums (titre 48px, corps 42px, accent 44px).
- Corps de texte (Nunito Sans) :
  - Taille de départ 68px, interlignage ×1.35.
  - Sur « Outline blanc » et « Underlay couleur » : poids 700 (gras), ombre portée noire
    marquée (opacité ~0.8, blur ~10px, léger décalage vertical) car le texte est posé
    directement sur la photo avec un overlay plus léger (25%).
  - Sur « Minimal centré » : poids 400 (normal), ombre plus légère (opacité ~0.5, blur 6px)
    car l'overlay de fond est déjà plus fort (40%).
  - Texte toujours blanc, quel que soit le template.
- Accent (Madimi One, taille de départ 72px, interlignage ×1.2) :
  - Sur « Underlay couleur » : bandeau couleur accent (#aaa8f8) par ligne, texte foncé
    (#323347) par-dessus, comme le titre.
  - Sur « Outline blanc » et « Minimal centré » : texte couleur accent (#aaa8f8) avec un
    contour (stroke) noir fin pour la lisibilité, pas de bandeau.
- Disposition verticale (templates non-centrés) : titre ancré en haut de la zone de
  contenu, accent ancré en bas, corps de texte centré verticalement dans l'espace restant
  entre les deux (avec un gap ~40px entre chaque bloc présent). Pour « Minimal centré » :
  les 3 blocs (titre, corps, accent) sont groupés et centrés ensemble, verticalement et
  horizontalement, dans la zone de contenu.

ÉTAT REACT ET LOGIQUE
- États principaux : format choisi, format d'export, texte markdown brut + texte markdown
  debouncé (300ms), tableau de fonds (un objet {type: 'color'|'image', color, image} par
  slide), tableau de templates (une chaîne par slide, "outline" par défaut), état de
  chargement des fonts.
- Deux `useEffect` synchronisent la longueur des tableaux `backgrounds` et `templates` sur
  le nombre de slides détecté dans le markdown (ajout/troncature en préservant les valeurs
  existantes par index).
- Un `useEffect` redessine tous les canvases à chaque changement de slides, fonds,
  templates, format ou disponibilité des fonts.
- Toute la logique de dessin (wrap de texte, calcul de layout, dessin du titre/corps/accent,
  dessin du fond) est factorisée en fonctions pures séparées du composant React, pour rester
  lisible et testable.

CONTRAINTES TECHNIQUES STRICTES
- Aucun appel réseau, aucun fetch, aucune clé API, aucune fonctionnalité de génération de
  texte par IA. C'est un outil 100% statique.
- Pas de `localStorage` ni `sessionStorage`.
- Pas de balises `<form>` — uniquement des handlers `onClick` / `onChange`.
- Un seul composant principal, export default, aucune prop requise.
- Le wrap de texte sur canvas doit être implémenté manuellement (mesure avec `measureText`),
  jamais délégué au CSS.
- Gestion d'erreur propre si une image ne charge pas (fallback sur la couleur de fond).
```

---

## 2. Déploiement sur GitHub Pages

Une fois le projet généré et fonctionnel en local (`npm run dev`) :

1. Vérifier que `vite.config.js` contient bien :
   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/NOM_DE_VOTRE_REPO/', // ex: '/carrousel-maker/'
   });
   ```
   (Si le repo est du type `username.github.io` à la racine, laisser `base: '/'`.)

2. Installer l'outil de déploiement :
   ```bash
   npm install -D gh-pages
   ```

3. Ajouter dans `package.json` :
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

4. Déployer :
   ```bash
   npm run deploy
   ```
   Cela pousse le contenu de `dist/` sur la branche `gh-pages`.

5. Dans les paramètres du repo GitHub → *Settings → Pages*, choisir la branche `gh-pages`
   comme source.

**Alternative recommandée : GitHub Actions**, pour que chaque push sur `main` redéploie
automatiquement. Fichier `.github/workflows/deploy.yml` :

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Et activer *Settings → Pages → Source : GitHub Actions* dans le repo.

---

## 3. Pièges fréquents et conseils

- **Ne pas laisser un outil "vibe coding" réintroduire un appel API.** Certains assistants,
  en voyant "générateur de légende" dans un ancien brief, ont tendance à vouloir ajouter un
  bouton IA "pour être complet". Précisez explicitement dans le prompt qu'il ne faut **aucun**
  appel réseau, comme fait ci-dessus.
- **Chemin `base` de Vite** : c'est l'erreur n°1 sur GitHub Pages. Si vous oubliez de le
  configurer (ou mettez le mauvais nom de repo), le site se charge mais toutes les images,
  polices et scripts renvoient des 404. Testez toujours avec `npm run build && npm run preview`
  avant de déployer.
- **Polices Google Fonts** : vérifiez que le `<link>` est bien injecté au montage (pas
  seulement dans `index.html`, sauf si vous préférez le mettre là directement — c'est même
  plus simple et plus fiable pour un export statique). Ajoutez `document.fonts.ready` avant
  le premier rendu canvas pour éviter un flash de police de fallback sur le premier slide.
- **Export `.webp`** : Safari plus anciens ont un support partiel de `canvas.toBlob('image/webp')`.
  Gardez `.jpg` comme option par défaut si vous visez une audience large.
  Si l'export webp est vraiment prioritaire, ajouter un fallback silencieux vers `.jpg` si le
  blob retourné est `null`.
  N'oubliez pas de mettre le layout à `flex-col` sur mobile (déjà prévu dans le prompt) sinon
  les deux panneaux se retrouvent illisibles sur petit écran.
- **Tester en navigation privée** après déploiement : GitHub Pages met parfois plusieurs
  minutes à propager, et le cache du navigateur peut afficher une ancienne version.
- **Vérifier la casse des noms de fichiers** : GitHub Pages est servi sur un système de
  fichiers sensible à la casse (contrairement à Windows/macOS en local), donc un import
  `./CarrouselMaker.jsx` qui fonctionne en local peut casser en prod si le fichier réel
  s'appelle `carrouselmaker.jsx`.
