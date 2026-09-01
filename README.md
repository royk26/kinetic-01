# KINETIC/01

An immersive, responsive 3D portfolio concept created through a Google Stitch → Google Flow → production agent workflow.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The Vite build uses relative asset paths, so it works on either a GitHub user site or a project site. The included GitHub Actions workflow deploys `dist/` to GitHub Pages on every push to `main`.

## Design provenance

- **Stitch:** generated the editorial layout direction, palette, typography, content hierarchy, and initial Three.js orb concept.
- **Flow + Flow Agent:** developed the cinematic visual direction for a dark electric-lime energy sculpture.
- **Production agent:** rebuilt the concept as a maintainable Vite/Three.js site, added interaction, accessibility, responsive behavior, testing, and deployment automation.
