# Pinterest-Inspired UI System

## Overview

Pinterest's marketing system is built around one principle: get out of the photograph's way. Chrome uses warm cream neutrals while saturated red is reserved for the strongest call to action. Imagery and content should carry the visual weight.

For this map editor, the equivalent product imagery is the map canvas and exported map image. Panels, buttons, and quick controls should stay quiet so the map, selected regions, labels, and output preview remain dominant.

## Core Tokens

### Colors

- `primary`: `#e60023`  
  Use only for the most important action, such as SVG export or one key active anchor.
- `primary-pressed`: `#cc001f`
- `canvas`: `#ffffff`
- `surface-soft`: `#fbfbf9`
- `surface-card`: `#f6f6f3`
- `secondary-bg`: `#e5e5e0`
- `secondary-pressed`: `#c8c8c1`
- `surface-dark`: `#262622`
- `hairline`: `#dadad3`
- `hairline-soft`: `#e5e5e0`
- `ink`: `#000000`
- `ink-soft`: `#211922`
- `body`: `#33332e`
- `charcoal`: `#262622`
- `mute`: `#62625b`
- `ash`: `#91918c`
- `stone`: `#c8c8c1`
- `on-dark`: `#ffffff`
- `focus-outer`: `#435ee5`
- `focus-inner`: `#ffffff`

### Typography

Pin Sans is proprietary, so this implementation uses Inter, system UI, Segoe UI, Roboto, Helvetica Neue, Arial, and Korean system sans fallbacks. Use weight and size for hierarchy rather than decorative color.

- Display: 44-70px, 600-700, tight tracking
- Heading: 22-28px, 600-700
- Body: 14-16px, 400-600
- Caption: 12px, 400-500
- Button: 12-14px, 700

### Radius

- `rounded.md`: `16px` for buttons, inputs, chips, standard cards
- `rounded.lg`: `32px` for large cards, panels, modal surfaces
- `rounded.full`: `9999px` for pills and circular controls

Avoid sharp interactive elements and avoid introducing extra intermediate radii.

### Layout

- Base spacing unit: `8px`
- Standard internal component gap: `8px`
- Major section rhythm: `64px` on marketing pages; compact tools may use tighter 8-16px spacing.
- Image/content grids use tight gutters so visual content becomes the hero.

## Component Rules

### Buttons

- Primary button: red background, white text, 16px radius, bold label
- Secondary button: gray-cream background, ink text, 16px radius
- Tertiary button: transparent/cream, ink text
- Icon buttons: circular or 16px rounded, quiet cream fill

### Cards & Panels

- Standard cards use `surface-card`, 16px radius, no heavy shadow.
- Large panels may use 32px radius but must remain visually quiet.
- The map canvas should not receive CSS color filters or decorative tinting.

### Quick Style Panel

The top guide panel is converted into a selected-region quick style bar:

- Shows current selection count and active region
- Offers color chips for quick semantic styling
- Offers border presets
- Offers non-selected boundary presets
- Keeps controls compact and cream-toned

### Map Output

The exported map should use:

- A quiet paper-like background
- Clear selected-region fill
- Consistent internal and external boundaries
- Labels with enough contrast
- SVG layers named for editing

## Do

- Let the map and selected administrative regions carry the visual emphasis.
- Use red sparingly for primary export/CTA actions.
- Use 16px radius for most UI controls and 32px for large panels.
- Keep panels cream/white and low contrast.
- Prefer chips and icon+label buttons for quick controls.
- Use strong contrast for selected boundary lines.

## Don't

- Do not use red as decoration.
- Do not add heavy shadows to ordinary cards.
- Do not apply CSS filters to the map imagery.
- Do not use many competing accent colors in UI chrome.
- Do not introduce sharp-cornered buttons.

## Responsive Behavior

- Desktop: full three-column workspace with left layer panel, center map, right style panel.
- Tablet/smaller desktop: preserve map width first; side panels may scroll.
- Mobile/narrow: controls should collapse into stacked panels and retain 44px touch targets.

## Implementation Notes

This app adapts the system rather than cloning Pinterest directly. The selected map output remains the core product image; cream chrome and limited red CTA use are the important transferable principles.
