# Logo T’Nature

Le logo de ce dossier n’a pas été livré par la cliente en fichier source. Il a été
**extrait de sa carte de visite** — `02-Contenus fournis/04-Logo & identité/Carte de
visite.pdf` — seul document où il figure en qualité d’impression. Le fichier
`logo-signature-mail.jpg` du même dossier ne fait que 198 × 142 px : inexploitable.

## Ce que contient ce dossier

| Fichier | Où il sert |
|---|---|
| `tnature-lettrage.png` (440×192) | en-tête, pages légales |
| `tnature-lettrage-blanc.png` | en-tête au-dessus du hero |
| `tnature-complet.png` (560×407) | **non utilisé par le site** — version couleur complète, pour la cliente |
| `tnature-complet-blanc.png` | rideau de chargement, pied de page |
| `favicon-32.png`, `-96`, `-180` | onglet du navigateur, écran d’accueil iOS |

Deux cadrages : le **lettrage** seul (« T’Nature » + la baseline), assez large pour tenir
dans la hauteur d’en-tête ; le **lockup complet**, lettrage + brin de blé, là où il y a de
la hauteur. Et pour chacun une version blanche.

Le lettrage **garde ses couleurs** dans la version « blanche » : c’est une aquarelle, la
repeindre en blanc la ferait disparaître. Seuls le « T’ », la baseline et les deux tirets
passent au blanc.

## Comment les refabriquer

```bash
python3 ../../../01-Structure/outils/extraire-logo.py
```

Dépendances : `poppler` (pour `pdftocairo`) et `cairosvg`. Le script écrit directement
dans ce dossier. Il n’y a rien à retoucher à la main — et surtout, **rien n’est
redessiné** : le détourage des lettres est celui du fichier d’origine.

Le principe, si le script doit être repris : la page de la carte est convertie en SVG, le
bloc de fond (le papier gris) et les lignes de coordonnées sont retirés, et ce qui reste
est rastérisé à 16× sur fond transparent avant réduction. Découper l’image aplatie aurait
obligé à inventer un canal alpha là où l’aquarelle est presque blanche.

## Ce qu’il reste à obtenir

1. **Le fichier vectoriel** (`.ai`, `.eps`, `.svg`). Ce qui est ici suffit pour le web à
   toutes les tailles utilisées, pas pour une enseigne ou un grand format.
2. **Le nom de la police du lettrage**, si la gérante le connaît. Le logo est une image et
   n’en dépend pas ; les titres du site utilisent `Caveat Brush`, qui en approche le trait.
3. **Le droit d’usage du logo Gîtes de France**, pour le badge « 3 épis ».
4. L’image Open Graph `assets/img/og-tnature.jpg` (1200×630), à produire une fois le
   reportage photo livré.
