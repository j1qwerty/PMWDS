const DEFAULT_MAX_CONCURRENT_READS = 2;
const API_PATH_MARKER = "/api/v1/";

type Waiter = {
  resolve: () => void;
};

let activeReads = 0;
let maxConcurrentReads = DEFAULT_MAX_CONCURRENT_READS;
const queue: Waiter[] = [];

function isApiReadRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;

  const url = input instanceof Request ? input.url : input.toString();
  return url.includes(API_PATH_MARKER) || url.includes("/api/v1?");
}

function releaseNextRead(): void {
  activeReads = Math.max(0, activeReads - 1);
  const next = queue.shift();
  if (!next) return;
  activeReads += 1;
  next.resolve();
}

function acquireRead(): Promise<void> {
  if (activeReads < maxConcurrentReads) {
    activeReads += 1;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    queue.push({ resolve });
  });
}

/**
 * Limits concurrent API reads without changing mutation concurrency.
 *
 * The app has several independently mounted pages that can issue the same expensive
 * list reads together. On constrained SQL Server instances, that cold-cache burst can
 * exhaust query memory grants before the queries even begin. Keeping at most two API
 * reads in flight lets SQL Server complete each heavy read instead of queueing seven
 * simultaneous grant requests.
 */
export function installApiReadConcurrencyLimit(limit = DEFAULT_MAX_CONCURRENT_READS): () => void {
  if (typeof window === "undefined" || limit < 1) return () => undefined;

  const originalFetch = window.fetch.bind(window);
  const previousMaxConcurrentReads = maxConcurrentReads;
  maxConcurrentReads = Math.floor(limit);
  let installed = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!installed || !isApiReadRequest(input, init)) {
      return originalFetch(input, init);
    }

    await acquireRead();
    try {
      return await originalFetch(input, init);
    } finally {
      releaseNextRead();
    }
  };

  return () => {
    installed = false;
    maxConcurrentReads = previousMaxConcurrentReads;
    window.fetch = originalFetch;
  };
}
