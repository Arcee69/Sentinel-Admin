/** Campaign lifecycle states offered in the setup form. */
export const SETUP_STATUSES = ["draft", "active", "paused", "archived"] as const;
export type SetupStatus = (typeof SETUP_STATUSES)[number];
