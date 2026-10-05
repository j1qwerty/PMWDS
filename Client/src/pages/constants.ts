export const projectStatuses = ["NotStarted", "InProgress", "OnHold", "Completed", "Cancelled", "Delayed"];
export const taskStatuses = ["NotStarted", "InProgress", "OnHold", "Completed", "Delayed", "Cancelled"];
export const milestoneStatuses = ["Pending", "InProgress", "Completed", "Delayed"];
export const priorities = ["Low", "Medium", "High", "Critical"];
export const availabilityStatuses = ["Available", "Busy", "OnLeave", "PartiallyBusy"];

/**
 * Height of the four dashboard overview cards - Project Overview, Activity,
 * High-Risk Escalations and Notifications.
 *
 * They render side by side in one grid row, so they have to match exactly or the
 * row ends up ragged. It lives here rather than being repeated as a Tailwind
 * class in each component so a change cannot update only some of them.
 *
 * Every one of these cards fills its remaining space with a scrolling or
 * stretching body (flex-1 min-h-0), so reducing this only shortens the visible
 * list - it does not clip headers or overlap content.
 */
export const DASHBOARD_OVERVIEW_CARD_HEIGHT = "h-[360px]";