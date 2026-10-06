# Nocturne Campaign Hub

## Implemented goals

- **Player character bios:** DMs assign a character to a player in the character's Tags field using `Player: username`. The username must match the player's sign-in username (the part before `@campaign.local`). Players can edit a public character bio visible to everyone and a private bio visible in the UI only to the assigned player and DMs. DMs can edit both bios. The private-bio restriction is UI-level, not database-level security. Run [supabase-character-public-bio.sql](supabase-character-public-bio.sql) once in the Supabase SQL editor to add the public bio field; existing `bio` and `description` content remains private.
- **Player homebrew inventory:** Players can add, edit, and remove items in their own inventory, including an item name, description, quantity, and value. DMs can view and manage every player's inventory. Run [supabase-player-homebrew-inventory.sql](supabase-player-homebrew-inventory.sql) once in the Supabase SQL editor to add the inventory fields and owner/DM access policies.
- **Inline editing:** Character backstories, homebrew inventory items, NPC hit points, campaign loot, session summaries, and restricted archive entries are edited in place. NPC hit points can be entered directly or adjusted by 1, 5, or 10; DMs can also create session chats with an inline form.
- **Markdown live previews:** Markdown editors show a live rendered preview while editing.
- **House common rooms:** Set each player's assigned character `house` field to `Phoenix`, `Fox`, or `Selkie`. The room lookup also recognizes `House: Phoenix`, `House: Fox`, or `House: Selkie` in the character Tags field. Players see their own house room and its minigame; DMs can preview all three rooms.
- **Player attendance:** DMs can mark assigned characters active or inactive from the Players page. The DM-only house totals count distinct active and inactive players by house. Blank `activity` values are treated as active until changed.

## Other features

- Player document access
- Password-protected DM notes
- DM-moderated roleplay chat between characters
- Session-chat dice roller; NPC death-save tracker appears at 0 HP
- DM-managed quest and rumor board
- Campaign dashboard with the latest recap, active leads, and next-session details
- Back navigation on every page, including browser and mouse back-button support

NPC death-save counts are stored on each NPC record. DMs can roll or reset saves from the NPC card when its HP reaches 0; death-save rolls are no longer posted in Session Chat. Run [supabase-npc-death-saves.sql](supabase-npc-death-saves.sql) in the Supabase SQL editor to add the tracking columns to NPCs.

NPC cards read class and race from their respective `npcs` columns. DM-only secrets and friendship milestones are loaded from `npc_secrets`, keyed by the matching NPC ID; DMs can edit them inline and reveal spoilers individually or use the global blackout control.

## Quest board and dashboard

Run [supabase-quest-board.sql](supabase-quest-board.sql) in the Supabase SQL editor to create the quest/rumor board, access policies, and shared next-session settings. DMs can add, edit, hide, and delete board entries; players only see entries marked visible. Quest statuses are open, in progress, and completed; rumor statuses are unverified, confirmed, and false. The next-session date and note on the home dashboard are visible to all players.

## Password reset requests

Password recovery is admin-driven because campaign accounts use synthetic `@campaign.local` addresses. Run [supabase-password-reset-requests.sql](supabase-password-reset-requests.sql) in the Supabase SQL editor. Players can then submit an inline reset request, and DMs can review and mark requests handled from the email inbox beside the campaign title.
