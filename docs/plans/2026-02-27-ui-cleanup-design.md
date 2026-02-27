# UI Cleanup: Node Cards & Export Toolbar

## Changes

### A: Simplify PersonNode Cards

Hide empty date fields in `PersonNode.tsx` (lines 136-142). Currently all four date rows (birth/death/marriage/divorce) render unconditionally, showing "—" when empty. Change to only render rows with values. If all four are empty, hide the entire date section.

- Files: `PersonNode.tsx`
- Effect: Node height reduced ~40-60px per card when dates are empty

### B: Move Export Toolbar to Header Dropdown

Move the four export actions (print, Excel, PNG, share link) from a fixed bottom bar into a dropdown menu in the Header, next to undo/redo.

- `Header.tsx` — Add export dropdown button with `useState` toggle + click-outside-to-close
- `App.tsx` — Remove `<ExportToolbar />` and bottom disclaimer
- Disclaimer text moves to the export dropdown footer or LeftPanel results tab bottom
- Export logic (guarded export, toast handling) moves into Header or a shared hook

Vertical space reclaimed: ~80px (50px toolbar + 30px disclaimer).
