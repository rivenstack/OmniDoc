# Usage with a vision model

Use no more than three images per prompt:

- Image A: visual tone
- Image B: product / catalog / core workflow behavior
- Image C: RTL or secondary-locale behavior (when relevant)

Tell the model exactly what may be borrowed from each image. Ask for an
audit and component specification before code. Never ask it to clone an
entire design. Compare output at desktop (~1440 px) and mobile (~390 px).

## Suggested first set (replace paths)

- Visual tone: `REF-01_tone.jpg`
- Catalog / workflow: `REF-02_workflow.jpg`
- Directionality study: `DERIVED-RTL-STUDY.jpg` (analytical only)
