/**
 * Trash retention policy.
 *
 * The NDEx server keeps soft-deleted files for a fixed window before purging
 * them. The UI states this number in several places (the trash tab banner, the
 * selection toolbar, the move-to-trash confirmation), so it lives here rather
 * than being repeated as a literal in each component.
 */
export const TRASH_RETENTION_DAYS = 30
