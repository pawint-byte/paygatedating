/**
 * Gift responses may contain a recipient's own shipping information. Keep
 * bodies out of logs for every gift endpoint, including errors and nested data.
 */
export function shouldLogApiResponseBody(path: string): boolean {
  return !/^\/api\/(?:gifts|setup|agent|assistant)(?:\/|$)/i.test(path.split("?")[0]);
}