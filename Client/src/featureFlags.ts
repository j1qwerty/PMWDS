/**
 * Temporary UI visibility flags.
 *
 * These hide features for every role without deleting the underlying code.
 * Flip a flag back to `true` to restore the feature.
 */

/** Hide the Skills page (sidebar nav item + /skills route). */
export const SHOW_SKILLS_PAGE = false;

/** Hide the Skills block on a user profile (/profiles). */
export const SHOW_PROFILE_SKILLS = false;

/** Hide the chat button in the top bar (there is no /chat route). */
export const SHOW_CHAT_BUTTON = false;