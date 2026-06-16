# Design System Specification: The Kinetic Archive

## 1. Overview & Creative North Star
This design system is built to transform the complexity of project monitoring into a high-fidelity, editorial experience. We are moving away from the "clunky dashboard" trope and toward a philosophy we call **"The Kinetic Archive."**

**The Kinetic Archive** treats data not as static entries in a table, but as living, breathing units of work within a sophisticated, multi-layered environment. The aesthetic is defined by architectural depth, tonal shifts rather than hard lines, and a high-contrast typographic scale that prioritizes clarity and authority. By utilizing intentional asymmetry and overlapping surfaces, we create a UI that feels curated, premium, and inherently trustworthy.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep obsidian tones, punctuated by high-vibrancy accents. Our goal is to use light as a way to define structure, rather than using outlines.

### The "No-Line" Rule
Designers are strictly prohibited from using 1px solid borders to section off major areas of the interface. Structural boundaries must be defined through **Background Color Shifts**. 
*   **Surface:** Use `surface` (#131318) for the global background.
*   **Nesting:** Place a `surface_container_low` (#1b1b20) sidebar or header against the main background to create a clean, modern break without a single line of CSS border.

### Surface Hierarchy & Nesting
Think of the UI as a series of physical layers—stacked sheets of obsidian glass.
*   **Base:** `surface_dim` (#131318)
*   **Sections:** `surface_container` (#1f1f24)
*   **Actionable Cards:** `surface_container_high` (#2a292f)
*   **Floating Modals:** `surface_container_highest` (#35343a)

### The "Glass & Gradient" Rule
To elevate the system beyond a standard dark mode, use **Glassmorphism** for floating elements (e.g., hover-state cards or dropdowns). Use a `backdrop-blur` of 12px-20px combined with a semi-transparent `surface_variant`. 
*   **Signature Textures:** For primary actions, do not use flat colors. Use a subtle linear gradient from `primary` (#c0c1ff) to `primary_container` (#8083ff) at a 135-degree angle. This adds "soul" and a sense of metallic sheen to the data-heavy environment.

---

## 3. Typography
We utilize **Inter** to maintain a surgical level of readability. The hierarchy is designed to feel like a high-end financial journal—bold headers that command attention followed by precise, dense metadata.

*   **Display (lg/md/sm):** Reserved for high-level KPIs and empty-state "hero" moments. Use `on_surface` with a letter-spacing of -0.02em.
*   **Headline (lg/md/sm):** Used for page titles and major section headers. These should feel authoritative.
*   **Title (lg/md/sm):** Used for card titles and secondary navigation. 
*   **Body (lg/md/sm):** The workhorse for data descriptions. Use `on_surface_variant` (#c7c4d7) for body text to reduce eye strain.
*   **Labels (md/sm):** Used for micro-copy, tags, and table headers. Always use `label-sm` for table headers in all-caps with 0.05em tracking to differentiate from data rows.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, mimicking how light hits a physical surface in a dark room.

*   **The Layering Principle:** Stack containers to create lift. An `error_container` should sit atop a `surface_container_high`, never the base `surface`. This creates a logical hierarchy of information importance.
*   **Ambient Shadows:** Use shadows sparingly. When required for modals, use a custom shadow: `0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow must feel like an ambient occlusion, not a "drop shadow."
*   **The "Ghost Border" Fallback:** If a divider is absolutely necessary for accessibility (e.g., inside a very dense data table), use a "Ghost Border": `outline_variant` (#464554) at 15% opacity. It should be felt, not seen.
*   **Depth through Blur:** Floating navigation or context menus must use `surface_container_highest` with a 60% alpha and a `backdrop-filter: blur(10px)`.

---

## 5. Components

### Buttons
*   **Primary:** Gradient (`primary` to `primary_container`), `rounded-md` (0.375rem). Text should be `on_primary` (#1000a9).
*   **Secondary:** Ghost style. No background, `outline` token at 20% opacity. On hover, transition to `surface_container_highest`.
*   **Tertiary:** Text-only using `primary` color. Use for low-priority actions like "Cancel" or "View Less."

### Input Fields
*   **Base State:** Background `surface_container_highest`, no border, `rounded-md`.
*   **Focus State:** A 2px "Ghost Border" using the `primary` token at 40% opacity. Do not use high-contrast rings.
*   **Error State:** Background shifts to `error_container` at 10% opacity with a `label-sm` error message in `error` (#ffb4ab).

### Cards & Lists
*   **Constraint:** Zero dividers. 
*   **Separation:** Use `8px` of vertical whitespace (from the spacing scale) and a subtle background shift between rows. 
*   **Interactive Lists:** On hover, a list item should transition from `surface` to `surface_container_low`.

### Specialized Components
*   **Status Beacons:** Instead of large "Status" tags, use small 8px circular "beacons" using `success`, `warning`, or `danger` tokens with a subtle outer glow (box-shadow) of the same color at 30% opacity.
*   **Progress Orbs:** For project monitoring, use circular progress indicators with a stroke-width of 2px, using `primary` for progress and `surface_variant` for the remaining track.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts. Align a large "Headline-lg" to the left with "Label-sm" metadata floated to the far right to create a sophisticated balance.
*   **Do** use "surface_container_low" for large layout blocks to differentiate from the true black "surface" background.
*   **Do** prioritize high information density. Junior designers often add too much padding; in this system, white space should be intentional but compact (use `sm` and `md` spacing tokens).

### Don't:
*   **Don't** use pure white (#ffffff) for body text. Use `on_surface_variant` (#c7c4d7) to maintain the premium dark aesthetic.
*   **Don't** use 100% opaque borders. They break the "Kinetic Archive" illusion and make the UI look like a legacy spreadsheet.
*   **Don't** use standard "drop shadows" with a Y-offset of 1 or 2px. If it doesn't have a large blur, it doesn't belong in this system.