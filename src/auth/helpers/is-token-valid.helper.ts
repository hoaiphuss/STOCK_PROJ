export function isTokenValid(
  token: string,
  expiry: number,
  now = Date.now(),
): boolean {
  /**
   * !!token return true if being not empty string, return false if being null or undefined or empty string
   */
  return !!token && expiry > now;
}
