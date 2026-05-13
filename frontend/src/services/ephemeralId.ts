/**
 * In-memory identifier helper.
 * IDs are used only for React keys and active-session message tracking.
 */
export function makeEphemeralId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
