export function isTokenValid(
  token: string,
  expiry: number,
  now = Date.now(),
): boolean {
  return !!token && expiry > now;
}
