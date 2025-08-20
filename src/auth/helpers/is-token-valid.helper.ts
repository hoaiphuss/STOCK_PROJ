export function isTokenValid(
  token: string,
  expiry: number,
  now = Date.now(),
): boolean {
  console.log("expiry: ", expiry);
  console.log("now: ", now);
  return !!token && expiry > now;
}
