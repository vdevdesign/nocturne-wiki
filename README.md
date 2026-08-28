# Goals
- Restrict Player Character Backstory doc access to specified player
- Player Homebrew Inventory
- Inline Editing for ALL edits

# Achieved:
- Player doc access
- Password protected DM Notes
- DM Moderated roleplay chat between characters

## Password reset requests

Password recovery is admin-driven because campaign accounts use synthetic `@campaign.local` addresses. Run [supabase-password-reset-requests.sql](supabase-password-reset-requests.sql) in the Supabase SQL editor. Players can then submit an inline reset request, and DMs can review and mark requests handled from the email inbox beside the campaign title.
