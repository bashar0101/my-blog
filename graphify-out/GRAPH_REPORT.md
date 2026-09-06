# Graph Report - Portfolio Planning Discussion  (2026-09-06)

## Corpus Check
- Corpus is ~18,551 words - fits in a single context window. You may not need a graph.

## Summary
- 155 nodes · 371 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 1% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.85)
- Token cost: 92,477 input · 0 output

## Community Hubs (Navigation)
- Image Slot Web Component
- DC Runtime Bootstrap
- Portfolio Page Content
- React Component Bridge
- External Module Loading
- Template AST Walker
- Prop and Attribute Compilation
- Design Direction Canvas
- Trilingual i18n Switcher
- Expression Path Resolution
- MCP Server Config
- CSS String Utilities

## God Nodes (most connected - your core abstractions)
1. `ImageSlot` - 27 edges
2. `get()` - 22 edges
3. `createRuntime()` - 22 edges
4. `Industry Home Page` - 15 edges
5. `boot()` - 12 edges
6. `Articles Index Page` - 10 edges
7. `Article Detail Page` - 10 edges
8. `updateHtml()` - 9 edges
9. `Projects Index Page` - 9 edges
10. `Videos Index Page` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Featured Projects Section` --semantically_similar_to--> `Project Card`  [INFERRED] [semantically similar]
  index.html → Projects.dc.html
- `Home Videos Section` --semantically_similar_to--> `YouTube Embed Slot`  [INFERRED] [semantically similar]
  index.html → Videos.dc.html
- `Latest Articles Section` --semantically_similar_to--> `Article List Row`  [INFERRED] [semantically similar]
  index.html → Articles.dc.html
- `Article List Row` --semantically_similar_to--> `Project Card`  [INFERRED] [semantically similar]
  Articles.dc.html → Projects.dc.html
- `Project Card` --semantically_similar_to--> `YouTube Embed Slot`  [INFERRED] [semantically similar]
  Projects.dc.html → Videos.dc.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Four-Direction Visual Exploration** — portfolio_directions_dc_direction_canvas, portfolio_directions_dc_industry_direction, portfolio_directions_dc_broadsheet_direction, portfolio_directions_dc_classical_direction, portfolio_directions_dc_modernist_direction [EXTRACTED 1.00]
- **Industry Visual Language** — index_industry_design_system, index_blueprint_corner_motif, index_duotone_image_treatment, index_image_slot_placeholder, portfolio_directions_dc_industry_direction [INFERRED 0.85]
- **Trilingual Content Surface** — index_trilingual_language_switcher, index_i18n_data_attribute_binding, index_primary_site_nav, index_site_footer [INFERRED 0.85]

## Communities (12 total, 2 thin omitted)

### Community 0 - "Image Slot Web Component"
Cohesion: 0.13
Nodes (7): flushNow(), getSlot(), ImageSlot, load(), save(), setSlot(), toDataUrl()

### Community 1 - "DC Runtime Bootstrap"
Cohesion: 0.18
Nodes (28): boot(), bundledBlob(), createComponentFactory(), getDC(), Dispatcher(), getError(), createHelmetManager(), applyCanvasBg() (+20 more)

### Community 2 - "Portfolio Page Content"
Cohesion: 0.22
Nodes (25): Article Detail Page, Java Code Sample Block, Long-form Reading Column, Article List Row, Articles Index Page, Blueprint Corner Motif, Contact Section, Duotone Image Treatment (+17 more)

### Community 3 - "React Component Bridge"
Cohesion: 0.13
Nodes (8): compileTemplate(), dcNameFromPath(), encodeCamelAttrs(), encodeCase(), getReactDOM(), Placeholder(), rootNameForDocument(), safeDecode()

### Community 4 - "External Module Loading"
Cohesion: 0.24
Nodes (12): cdnScriptFor(), createExternalModules(), ensureBabel(), load(), resolve2(), resolveGlobal(), waitForGlobal(), isElementClass() (+4 more)

### Community 5 - "Template AST Walker"
Cohesion: 0.33
Nodes (10): contentKey(), evalDcLogic(), getReact(), walk(), walkChildren(), walkElement(), walkFor(), walkIf() (+2 more)

### Community 6 - "Prop and Attribute Compilation"
Cohesion: 0.48
Nodes (7): collectProps(), compileAttr(), cssToObj(), hostPositionStyle(), kebabToCamel(), walkComponent(), walkXImport()

### Community 7 - "Design Direction Canvas"
Cohesion: 0.70
Nodes (5): Broadsheet Direction (1b), Classical Direction (1c), Portfolio Direction Comparison Canvas, Industry Direction (1a), Modernist Direction (1d)

### Community 9 - "Expression Path Resolution"
Cohesion: 0.50
Nodes (4): findTopLevelEquality(), parensWrapWhole(), resolve(), resolvePath()

### Community 11 - "CSS String Utilities"
Cohesion: 1.00
Nodes (3): importantify(), scanUnquotedUrl(), stripComments()

## Ambiguous Edges - Review These
- `image-slot Placeholder Component` → `Articles Index Page`  [AMBIGUOUS]
  Articles.dc.html · relation: conceptually_related_to
- `Trilingual Language Switcher (EN/TR/AR)` → `Contact Section`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **1 isolated node(s):** `uvx`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 15 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `image-slot Placeholder Component` and `Articles Index Page`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Trilingual Language Switcher (EN/TR/AR)` and `Contact Section`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `createRuntime()` connect `DC Runtime Bootstrap` to `Expression Path Resolution`, `React Component Bridge`, `External Module Loading`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `get()` connect `DC Runtime Bootstrap` to `External Module Loading`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `createRuntime()` (e.g. with `adoptParsed()` and `dcUpdate()`) actually correct?**
  _`createRuntime()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `uvx` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Image Slot Web Component` be split into smaller, more focused modules?**
  _Cohesion score 0.1319073083778966 - nodes in this community are weakly interconnected._