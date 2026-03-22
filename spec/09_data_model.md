# 09 Data Model (Prisma)

## users
- `user_id` (PK)
- `email` (unique, nullable)
- `password_hash`
- `username` (unique)
- `status` (default: `ANONYMOUS`)
- `role` (default: `USER`)
- `last_connected_at` (default: now)
- `username_changed`

補足:
- guest 判定は `sessions.is_guest` ではなく `users.status == ANONYMOUS` を利用する

## sessions
- `session_id` (PK)
- `user_id` (FK)
- `expires_at`

## user_settings
- `id` (PK)
- `user_id` (FK, UNIQUE)
- `auto_muck_when_losing` (default: true)
- `history_exclude_preflop_folds` (default: false)
- `stack_display` (default: `"blinds"`)

## hand_records
- `hand_id` (PK)
- `room_id`, `match_id`, `hand_no_in_match`
- `played_at`, `hand_started_at`
- `mode`, `max_players`, `button_seat`, `sb_seat`, `bb_seat`
- `stakes_json`, `initial_stacks_json`, `final_stacks_json`
- `board_cards_json`, `actions_json`, `result_json`, `room_snapshot_json`
- `integrity_hash`

## hand_participants
- `hand_participant_id` (PK)
- `hand_id` (FK)
- `user_id` (FK, nullable)
- `seat`
- `role`
  - ポジションを保持する
  - 主な値: `BTN`, `BB`, `UTG`, `CO`
  - 既存データや補完不能データは `UNKNOWN`
- `joined_at_hand_start`, `left_before_hand_end`
- `hole_cards_json`, `showed_hole_cards`, `folded_street`
- `net_result_points`, `starting_stack_points`, `ending_stack_points`, `is_winner`

## match_sessions
- `match_id` (PK)
- `room_id`
- `config_snapshot_json`
- `next_hand_no`

## password_reset_tokens
- `token` (PK)
- `user_id` (FK)
- `expires_at`
- `used`

## hand_archive_posts
- `post_id` (PK)
- `hand_id` (unique, FK)
- `author_user_id` (FK)
- `title`, `private_note`, `status`, `focus_point`
- `created_at`, `updated_at`
- `views_total`, `views_unique`, `dwell_ms_total`, `dwell_ms_avg`

補足:
- Gallery 一覧表示では `author_user_id` から `users.username` を解決し、`authorUsername` として返却する

## hand_archive_post_fixed_tags
- `post_id` (FK)
- `tag_key`

## hand_archive_post_free_tags
- `post_id` (FK)
- `tag_text`
- `tag_norm`

## hand_archive_likes
- `post_id` (FK)
- `user_id` (FK)
- `created_at`

## hand_archive_viewer_tags
- `post_id` (FK)
- `user_id` (FK)
- `tag_key`
- `created_at`

## hand_archive_view_uniques
- `post_id` (FK)
- `viewer_key`
- `created_at`

## hand_archive_view_sessions
- `session_id` (PK)
- `post_id` (FK)
- `viewer_key`
- `started_at`, `ended_at`
- `dwell_ms`
