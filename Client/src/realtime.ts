import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import type { DataChangedNotification } from "./realtimeScopes";

/**
 * SignalR connection to the API's `DashboardHub`.
 *
 * The hub already existed and was already mapped in Program.cs (`/hubs/dashboard`), but
 * nothing ever pushed to it and no client ever connected. This wires the two halves
 * together. See docs/realtime-sync-and-data-durability.md step 4.
 *
 * This is a *hint* channel only. Every handler refetches through the normal authorized
 * API, so a stale or forged notification can never surface data the caller is not
 * allowed to read.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:5177/api/v1";

/** Matches STORAGE_KEY in auth.tsx, where the current JWT is persisted. */
const AUTH_STORAGE_KEY = "pmwds-client-auth";

export type RealtimeStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

type DataChangedHandler = (notification: DataChangedNotification) => void;
type StatusHandler = (status: RealtimeStatus) => void;

function resolveHubUrl(): string {
  // API_BASE_URL looks like `https://host/api/v1` or a relative `/api/v1`. The hub is
  // served from the same origin under `/hubs/dashboard`. A relative base is resolved
  // against the page origin so the browser navigates to the same host that served the app.
  let base = API_BASE_URL;
  if (/^https?:\/\//i.test(base)) {
    base = new URL(base).origin;
  } else if (typeof window !== "undefined" && base.startsWith("/")) {
    base = `${window.location.origin}${base}`;
  }
  return `${base.replace(/\/$/, "")}/hubs/dashboard`;
}

function currentToken(): string | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { token?: string | null }).token ?? null;
  } catch {
    return null;
  }
}

let connection: HubConnection | null = null;
let starting: Promise<void> | null = null;
let status: RealtimeStatus = "disconnected";

const dataChangedHandlers = new Set<DataChangedHandler>();
const statusHandlers = new Set<StatusHandler>();

function setStatus(next: RealtimeStatus) {
  if (status === next) return;
  status = next;
  statusHandlers.forEach((handler) => {
    try {
      handler(next);
    } catch {
      // A misbehaving subscriber must not break the connection for everyone else.
    }
  });
}

function build(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(resolveHubUrl(), {
      // Read fresh on every (re)negotiate rather than closing over a token captured at
      // start time. auth.tsx rewrites localStorage when it refreshes the JWT, so a socket
      // that reconnects after expiry picks up the new one instead of failing to 401.
      accessTokenFactory: () => currentToken() ?? "",
      withCredentials: true,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();
}

/**
 * Connects if not already connected. Safe to call repeatedly and from multiple
 * components (React StrictMode mounts everything twice in development).
 */
export function startRealtime(): Promise<void> {
  if (connection && connection.state !== HubConnectionState.Disconnected) {
    return starting ?? Promise.resolve();
  }

  if (starting) return starting;

  const hub = build();

  hub.on("DataChanged", (notification: DataChangedNotification) => {
    if (!notification?.scope) return;
    dataChangedHandlers.forEach((handler) => {
      try {
        handler(notification);
      } catch {
        // One bad subscriber must not stop the others from refreshing.
      }
    });
  });

  hub.onreconnecting(() => setStatus("reconnecting"));
  hub.onreconnected(() => setStatus("connected"));
  hub.onclose(() => setStatus("disconnected"));

  setStatus("connecting");

  starting = hub
    .start()
    .then(() => {
      setStatus("connected");
    })
    .catch((error: unknown) => {
      // Losing the socket is survivable: the focus-refetch and 60s poll in appData cover
      // it. Do not throw, or an unreachable hub would break the whole app.
      setStatus("disconnected");
      console.warn(
        "[realtime] Could not connect to the dashboard hub; falling back to polling.",
        error,
      );
    })
    .finally(() => {
      starting = null;
    });

  return starting;
}

export function stopRealtime(): void {
  dataChangedHandlers.clear();
  statusHandlers.clear();
  starting = null;

  const hub = connection;
  connection = null;
  setStatus("disconnected");

  if (hub) {
    void hub.stop().catch(() => undefined);
  }
}

/**
 * Registers a handler for the `DataChanged` event. Returns an unsubscribe function.
 * Handlers registered before the connection starts are kept and invoked once it does.
 */
export function onDataChanged(handler: DataChangedHandler): () => void {
  dataChangedHandlers.add(handler);
  return () => {
    dataChangedHandlers.delete(handler);
  };
}

/** Registers a handler for connection status changes (offline indicator). */
export function onStatusChanged(handler: StatusHandler): () => void {
  statusHandlers.add(handler);
  try {
    handler(status);
  } catch {
    // ignore
  }
  return () => {
    statusHandlers.delete(handler);
  };
}

export function getRealtimeStatus(): RealtimeStatus {
  return status;
}

/**
 * Whether the client can rely on the socket rather than the poll. Used to skip the
 * safety-net interval when the socket is healthy, so a working setup does not pay for
 * both.
 */
export function isRealtimeHealthy(): boolean {
  return connection?.state === HubConnectionState.Connected;
}
