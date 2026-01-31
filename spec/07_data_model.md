# 07 Data Model (Prisma)

## users
- user_id (PK)
- email (unique, nullable)
- password_hash
- username (unique)
- username_changed

## sessions
- session_id (PK)
- user_id (FK)
- is_guest
- expires_at

## hand_records
- hand_id (PK)
- room_id, match_id, hand_no_in_match
- played_at, hand_started_at
- mode, max_players, button_seat, sb_seat, bb_seat
- stakes_json, initial_stacks_json, final_stacks_json
- board_cards_json, actions_json, result_json, room_snapshot_json

## hand_participants
- hand_participant_id (PK)
- hand_id (FK)
- user_id (FK, nullable)
- seat, role
- hole_cards_json, showed_hole_cards, folded_street
- net_result_bb, starting_stack_bb, ending_stack_bb, is_winner

## match_sessions
- match_id (PK)
- room_id
- config_snapshot_json
- next_hand_no

## password_reset_tokens
- token (PK)
- user_id (FK)
- expires_at
- used

## user_settings
- id (PK)
- user_id (FK, UNIQUE)
- auto_muck_when_losing
- history_exclude_preflop_folds
- stack_display
