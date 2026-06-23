# Master Setting

A web app for tracking Pokémon TCG Master Set collections. Users track which slots they own across one or more sets, working toward completion.

## Language

**Master Set**:
A set where the collector owns one of every slot. "Completing a master set" means owning all slots in that set.
_Avoid_: complete set, full set, finished set

**Set**:
A named Pokémon TCG release (e.g. "Base Set"). Part of the catalogue — exists independently of any user.
_Avoid_: expansion, collection

**Tracked Set**:
A set a specific user has chosen to follow. Carries per-user state: owned slots, layout preference, focus filter.
_Avoid_: saved set, added set

**Card**:
A single named entry in a set's card list. Identified by card number and name. A card produces one or more slots (one per variant).
_Avoid_: collectible (that's a slot)

**Slot**:
The physical binder position for a specific card × variant combination. The atomic collectible unit — owning a slot means you have that card in that variant. Slots are numbered sequentially within a set.
_Avoid_: card (when referring to the collectible unit), item, entry

**Variant**:
The specific print version of a card (e.g. `normal`, `holo`, `reverse`). Every slot has exactly one variant. The variant label is shown on a card cell only when the card has more than one variant — single-variant cards show no label.
_Avoid_: version, edition, print

**Filter**:
A per-set setting controlling which slots are shown: All, Missing, or Collected. In binder mode, filtered-out slots are dimmed. In list mode, filtered-out slots are hidden entirely.
_Avoid_: focus, focus mode, focus filter

**Missing**:
A slot the user does not own.
_Avoid_: unowned, not collected, absent

**Collected**:
A slot the user owns.
_Avoid_: owned, marked, have

**Binder Mode**:
The default layout for viewing a set. Slots are arranged in pages — fixed grids of 3–4 columns × 3 rows — separated by page dividers. The final page is padded with empty pockets.
_Avoid_: grid mode, page mode

**List Mode**:
An alternate layout for viewing a set. Slots flow in a continuous grid with no pages, dividers, or empty pockets. Filter hides slots entirely instead of dimming them. Lives on the same route as binder mode.
_Avoid_: flow mode, grid mode

**Page**:
A fixed grid of slots within binder mode (3–4 columns × 3 rows). Separated by page dividers. The final page may contain empty pockets.
_Avoid_: binder page, screen

**Progress**:
The fraction of slots owned out of total slots for a tracked set (e.g. 142 / 234). Displayed as a fraction, percentage, and progress bar on the Dashboard.
_Avoid_: completion rate, percentage, score

**Complete**:
A tracked set where progress has reached 100% — every slot is owned.
_Avoid_: finished, done, mastered

**Series**:
A named grouping of related sets (e.g. "Base", "Neo", "EX"). Sets are grouped by series on the Dashboard and Add Set screen, sorted by release date within each series.
_Avoid_: era, generation, block

**Catalogue**:
The read-only set of all available sets and their cards. Managed by admin scripts; never written by the client. Stored in Postgres (`sets` table) and Supabase Storage (per-set card JSON, logos).
_Avoid_: database, set library, set list

**Card Detail**:
A modal overlay showing a single slot's full-size card image, name, number, variant, and collected toggle. Supports horizontal navigation between adjacent slots via swipe or arrow keys. Does not have its own URL.
_Avoid_: card view, card page, card modal

**Browse Mode**:
The default binder interaction mode. Tapping a card opens the card detail view. The binder is always in Browse Mode unless the user has entered Mark Mode.
_Avoid_: view mode, default mode

**Mark Mode**:
The binder interaction mode where tapping a card toggles its owned state instead of opening the card detail. Pending changes accumulate locally and are written to the database only when the user applies them.
_Avoid_: edit mode, collection mode

**Pending Changes**:
The set of ownership toggles accumulated during a Mark Mode session, held in local state. Applied as a batch on "Apply", discarded on "Cancel".
_Avoid_: staged changes, draft, diff

**Apply**:
The action that writes pending changes to the database and exits Mark Mode.
_Avoid_: commit, save, confirm, done

**Empty Pocket**:
A visual padding cell at the end of the last binder page, added when the number of slots doesn't fill the page evenly. Has no collectible and no interaction.
_Avoid_: empty slot, empty card
