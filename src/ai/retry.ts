
export type Fn<T> = () => Promise<T>;

export async function withRetry<T>(
  fn: Fn<T>,
  {
    retries = 5,
    baseMs = 400, // start ~0.4s
    maxMs = 8000, // cap at 8s
    onRetry,
  }: { retries?: number; baseMs?: number; maxMs?: number; onRetry?: (e: any, i: number, d: number) => void } = {}
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      const isRetryable =
        status === 429 ||
        (status >= 500 && status < 600) ||
        // network-ish
        e?.code === 'ECONNRESET' ||
        e?.code === 'ETIMEDOUT';

      if (!isRetryable || attempt >= retries) throw e;

      const delay =
        Math.min(maxMs, Math.round((baseMs * 2 ** attempt) * (1 + Math.random())));
      onRetry?.(e, attempt + 1, delay);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}
