## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## QA

Before reporting any prompt that touches layout, animation, forms, navigation, or focus/keyboard behavior as "verified" or "working," run the browser-qa skill (`.claude/skills/browser-qa/SKILL.md`) — it drives a real headless Chromium via Playwright. Code inspection, grep, `astro check`, and `astro build` passing are necessary but not sufficient; none of them prove a page renders or behaves correctly. Say explicitly which parts were actually observed in a browser vs. only checked at the build/code level.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
