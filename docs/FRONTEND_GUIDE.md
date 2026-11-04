# Frontend guide

**Design:**
- Dark industrial theme with high contrast; a light theme is available.
- Colour-blind-safe Okabe–Ito palette for series. Gas colours: O₂ sky blue, Ar purple, N₂ green.
- IBM Plex Sans / Mono fonts, with a system-font fallback if Google Fonts is blocked.

**Accessibility:**
- Skip link, focus rings, keyboard-navigable nav and controls, ARIA labels on charts.
- Reduced motion (setting or `prefers-reduced-motion`) disables particles and animation.
- Responsive layout: icon-rail navigation under 980 px, horizontal nav under 640 px, no horizontal overflow at 390 px width (e2e check).

**3D:**
- Three.js scene built from the backend geometry. Vessel profiles come from LatheGeometry and include shell, safety lining, working lining and the cutaway.
- The bath and slag levels follow the simulated masses. Bath colour follows temperature; slag colour shifts with Cr₂O₃.
- Tuyere count and arc come from the design. The plume colour reflects the O₂/Ar/N₂ mix.
- The top lance appears for AOD-L. The vessel tilts for turndown and tap. Additions are drawn as falling chunks at event times.
- CSS2D labels. OrbitControls for the camera.
- If WebGL is unavailable, the view falls back to the SVG schematic.

**Extending:** add a view module exporting `render()` → `{html, mount(root)}` and register it in `app.js` and `components/nav.js`.
