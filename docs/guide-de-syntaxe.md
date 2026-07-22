# Guide de syntaxe — Carrousel Maker

Ce document décrit la syntaxe markdown attendue par l'outil « Carrousel Maker » pour générer des carrousels et stories Instagram. Il est destiné à un agent IA (ou un humain) chargé de produire du contenu prêt à coller dans l'outil.

## Principe

Un seul bloc de texte markdown décrit l'intégralité du carrousel. Chaque slide est séparée par `---`. L'outil déduit automatiquement le nombre de slides (1 à 10 maximum).

## Syntaxe par slide

Chaque slide peut contenir jusqu'à 3 zones, toutes optionnelles :

| Marqueur | Zone | Rendu |
|---|---|---|
| `# Texte` | Gros titre | League Spartan bold, très grande taille, effet selon template |
| Texte sans marqueur | Corps | SN Pro, taille moyenne |
| `> Texte` | Section accent | Madimi One, couleur accent `#aaa8f8` (ou bandeau accent) |

## Règles

1. `---` doit être seul sur sa ligne pour séparer deux slides.
2. Une seule ligne `#` par slide (si plusieurs, seule la première est le titre ; les suivantes sont fusionnées au corps).
3. Plusieurs lignes de corps sont autorisées ; elles sont concaténées avec retour à la ligne.
4. Une seule section `>` par slide recommandée (si plusieurs, elles sont fusionnées).
5. Maximum 10 slides — tout contenu au-delà du 10e séparateur est ignoré.
6. Pas de gras/italique markdown (`**`, `*`) : non interprétés en V1, à éviter.
7. Pas d'emojis dans le titre (rendu canvas inégal selon les plateformes) ; tolérés dans le corps mais à limiter.

## Contraintes de longueur (recommandations fortes)

L'outil réduit automatiquement la taille du texte en cas de débordement, mais pour un rendu optimal :

- **Titre** : 3 à 8 mots (max ~45 caractères)
- **Corps** : 1 à 3 phrases courtes (max ~220 caractères)
- **Accent** : 1 phrase punchy (max ~80 caractères)
- **Format story (1080×1920)** : les mêmes limites s'appliquent ; le format vertical tolère un corps légèrement plus long.

## Structure éditoriale recommandée

- **Slide 1** : hook — titre seul ou titre + accent, pas de corps. C'est la slide qui arrête le scroll.
- **Slides intermédiaires** : un point/idée par slide. Titre court + corps + accent optionnel.
- **Dernière slide** : call-to-action — titre + accent (ex. « Sauvegarde ce post », « Lien en bio »).

## Exemple complet (carrousel 5 slides)

```
# Ton esprit sait déjà
> Swipe pour comprendre pourquoi.
---
# La répétition crée le réel
Le corps suit toujours ce que l'esprit répète. Chaque pensée récurrente devient une instruction.
---
# Le piège
Tu répètes déjà des phrases, tous les jours. La plupart jouent contre toi.
> « Je n'y arrive jamais » est une suggestion hypnotique.
---
# Le retournement
Choisis une phrase. Une seule. Répète-la ce soir, à voix basse, trois fois.
> LE DÉCLIC : la constance bat l'intensité.
---
# C'est tout pour aujourd'hui
> Sauvegarde ce post et reviens-y ce soir.
```

## Ce que l'agent NE gère PAS

Ces éléments sont configurés par l'utilisateur directement dans l'outil, l'agent ne doit pas tenter de les décrire dans le markdown :

- Le format (carrousel 1080×1350 ou story 1080×1920)
- Le template visuel (Outline blanc / Underlay couleur / Minimal centré)
- Les images de fond et couleurs unies
- Le format d'export (.jpg / .webp)
- La légende Instagram, le premier commentaire et les hashtags (générés séparément par l'outil)

## Sortie attendue de l'agent

Uniquement le bloc markdown, sans commentaire, sans backticks d'encadrement, prêt à être collé tel quel dans la zone de saisie de l'outil.
