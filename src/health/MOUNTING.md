<!-- Top-bar integration for the orchestrator. -->
# Mount the Gemini services chip

In `src/shell/TopBar.tsx`, add the import and place the chip inside `.pw-top-actions`, beside Watch.

```tsx
import ServicesChip from "@/health/ServicesChip";
<ServicesChip />
```
