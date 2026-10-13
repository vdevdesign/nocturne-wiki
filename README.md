# Nocturne Campaign Hub

## Implemented goals

- **Player character cards:** New accounts automatically receive a starter character whose `id` is the username before `@campaign.local` and whose display `name` capitalizes the first letter. Character cards show the public character name, uploaded portrait, appearance, and public bio. DMs can edit the full character template (full real name, age, aliases, parents, race, class, hometown, appearance, background, goals, fears, and bonds); players can edit their public appearance, portrait, and public bio. The private-bio restriction is UI-level, not database-level security. Run [supabase-character-public-bio.sql](supabase-character-public-bio.sql) and [supabase-character-details.sql](supabase-character-details.sql) once in the Supabase SQL editor to add the public bio and character template fields; existing `bio` and `description` content remains private.
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

If Session Chat reports that `recipient_name` is missing from `session_messages`, run [supabase-session-chat-whispers.sql](supabase-session-chat-whispers.sql) in the Supabase SQL editor. This adds the column used to display whisper recipients and refreshes the PostgREST schema cache.

NPC death-save counts are stored on each NPC record. DMs can roll or reset saves from the NPC card when its HP reaches 0; death-save rolls are no longer posted in Session Chat. Run [supabase-npc-death-saves.sql](supabase-npc-death-saves.sql) in the Supabase SQL editor to add the tracking columns to NPCs.

NPC cards read class and race from their respective `npcs` columns. DM-only secrets and friendship milestones are loaded from `npc_secrets`, keyed by the matching NPC ID; DMs can edit them inline and reveal spoilers individually or use the global blackout control.

## Quest board and dashboard

Run [supabase-quest-board.sql](supabase-quest-board.sql) in the Supabase SQL editor to create the quest/rumor board, access policies, and shared next-session settings. DMs can add, edit, hide, and delete board entries; players only see entries marked visible. Quest statuses are open, in progress, and completed; rumor statuses are unverified, confirmed, and false. The next-session date and note on the home dashboard are visible to all players.

## Password reset requests

Password recovery is admin-driven because campaign accounts use synthetic `@campaign.local` addresses. Run [supabase-password-reset-requests.sql](supabase-password-reset-requests.sql) in the Supabase SQL editor. Signed-out players can submit an inline reset request; only DMs can review requests and set a new password from the email inbox beside the campaign title. To enable password changes, install Node.js (which includes `npx`), then run these commands in PowerShell from the project folder:

Player suggestions use the same DM inbox. Run [supabase-player-suggestions.sql](supabase-player-suggestions.sql) in the Supabase SQL editor once to create its table and access policies.

```powershell
npx supabase login
npx supabase link --project-ref xpsaorwxjminbnmooojc
npx supabase functions deploy change-password
```

Supabase supplies the service-role key to the Edge Function environment; never add it to the website.

## House games

Run [supabase-house-games.sql](supabase-house-games.sql) in the Supabase SQL editor after the existing character details setup. It creates starter characters for new accounts, backfills characters for existing accounts, copies house assignments to `profiles.house`, keeps profile and character assignments synchronized, creates the tournament and common room game tables and server-side RPCs, and seeds the house leaderboard. Verify `profiles.house` after migration if existing character assignments use a different key.

Players can create or join cross-house Rune Duels and watch active or completed tournament matches in a read-only view; rune choices are revealed only after both players submit. Each player may create one open Rune Duel at a time. Session cards identify the creator, and DMs can delete waiting requests. Signed-in users receive an in-app notification when a new Rune Duel is requested. Rune Duel artwork and the matchup chart are stored in `assets/rune-duel/`. Common Rooms contains the shared constellation game for members of the assigned house; it is not available to spectators from other houses. Tournament winners earn 1 point, and each house can earn at most 5 points per UTC day per unique game (across both tournament and common room games). The SQL functions enforce the points limit and match rules. Restricted Archives includes a House Points History card showing every award. If a player closes a tournament match before it ends, that match remains active and they can return from the House Games page after signing in again.

If the spectator list reports that `get_game_sessions` is missing, rerun the latest full `supabase-house-games.sql` file. It installs the session-list RPC and requests a PostgREST schema-cache reload.
