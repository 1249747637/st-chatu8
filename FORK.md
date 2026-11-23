# Toastoast maintained fork

This is a non-commercial maintained fork of [damoshen123/st-chatu8](https://github.com/damoshen123/st-chatu8), maintained by **Toastoast / GitHub `1249747637`**. Original authorship and copyright notices remain intact.

The complete work remains covered by **Aladdin Free Public License, version 9**. Read or print [`LICENSE`](LICENSE) for the full terms. AFPL v9 is not an Open Source Initiative-approved license. No warranty is provided.

## Baseline and changes

The maintained branch is **`toast-maintained`**, based on upstream commit **`a4c417f98e9697be44935486a0504713532994b3`** (v3.2.1), not on subsequent upstream main commits.

Modified on **2026-11-22**:

- Preserve separate preview-image IDs and physical filenames, preventing preset preview images from overwriting each other.
- Synchronize visual preset renames with native preset options and every active mode reference, without clearing prompt fields.
- Point both built-in update checks and the reinstall guide to this fork.
- Set `manifest.auto_update` explicitly to `false`.

The default branch is `toast-maintained`. The inherited `main` branch is retained for provenance; it is not the installed maintenance branch. There is no automatic upstream-sync workflow for this maintained branch. Future upstream changes are reviewed and integrated manually only.

## Style and model presets — 3.2.2-toast.1

Prompt presets are now labelled **画风及模型预设** and carry isolated NovelAI model settings: model, Effort, straight-alpha output, sampler, schedule, guidance, dimensions, steps, seed and quality toggles. API connection profiles remain separate. New empty presets inherit only the previously opened preset's model settings; their prompts stay empty.

Both native and visual lists share common sorting and favorites. Creating a preset switches to newest-first, exits favorites-only and puts the new preset first. There is no drag or custom ordering. Legacy presets are migrated idempotently from the current model settings while keeping prompt text and preview references unchanged. Existing API-profile legacy fields are retained as archival data but are not applied to the active model.

Generation and inpaint capture the selected model settings before asynchronous queue work. Model snapshots are filtered when importing/exporting, so API credentials do not enter model data. Vibe/image data are not copied into each preset. The original preview-isolation and fork-update isolation remain in place.

## API profile switching — 3.2.2-toast.2

Switching the API-profile selector now saves the outgoing profile's current API edits before applying the next profile. The requested profile ID is committed before client-dependent refreshes, preventing the selector from reverting to the previous/default entry. Model preset data and API-profile archival fields remain separate. The explicit load button still loads saved values.

## Installation

Install `https://github.com/1249747637/st-chatu8.git` through SillyTavern's extension manager. The default branch is the maintained branch. If choosing a branch explicitly, select `toast-maintained`.

Existing installations retain the original `st-chatu8` extension directory and settings namespace. No private user presets, chats, API credentials or generated images are included by these modifications.

Manual extension updates pull this fork's maintained branch, not the original author's main branch.
