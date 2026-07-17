# Awesome Cursor Skills (reference)

Cloned from `https://github.com/spencerpauly/awesome-cursor-skills` on 2026-07-15.

**This is a reference catalog, not an active skill set.** It lives outside `.cursor/skills/` deliberately so the ~70 `SKILL.md` files in `resources/` do NOT auto-load into agent context.

## How to use

1. Browse `README.md` for the full categorized index.
2. When you actually want a specific skill, copy its `SKILL.md` into `.cursor/skills/<skill-name>/SKILL.md` (and any helper scripts it references). It then becomes an active, auto-loaded skill.
3. To update the catalog: `git pull` from inside this directory.

## Origin

This is the curated awesome-list repo. Many entries link to third-party GitHub repos (PostHog, Sentry, Vercel, Anthropic, Matt Pocock, etc.) — those are external skills you'd install separately if you want them.

The actual `resources/*/SKILL.md` files bundled here are short, opinionated workflows maintained by the awesome-cursor-skills maintainer.