---
name: Local theme provider compatibility
description: Theme persistence for this Vite app must avoid the installed next-themes runtime.
---

Use the app-local theme provider for light/dark mode instead of `next-themes`.

**Why:** The installed `next-themes` package produced an `Invalid hook call` in the preview runtime, even though TypeScript passed and the page initially rendered.

**How to apply:** Keep the theme state in the app, toggle the `dark` class on `document.documentElement`, and persist the choice under the existing inventory theme storage key.