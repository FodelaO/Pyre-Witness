<!-- Top-bar integration for the orchestrator. -->
# Mount the theme switch

Add this import in `src/shell/TopBar.tsx`:

```tsx
import ThemeToggle from "@/theme/ThemeToggle";
```

Inside `.pw-top-actions`, after the Proof link and immediately before the desktop risk chip:

```tsx
<ThemeToggle />
```

The global stylesheet import and pre-paint script live in the root app files.

Run `node src/theme/verify.mjs` from the project root to check the mounted switch and save the 1440×900 screenshots.
