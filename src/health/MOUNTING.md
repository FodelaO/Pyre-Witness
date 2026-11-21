<!-- Crew dock integration for the services board. -->
# Mount the Gemini services chip

In `src/crew/CrewDock.tsx`, place the chip in the dock header beside the transcript button. The crew cards use `useCrewHealth` and `CrewHealthDot` to show the assigned engine's reading.

```tsx
import ServicesChip from "@/health/ServicesChip";
<ServicesChip />
```
