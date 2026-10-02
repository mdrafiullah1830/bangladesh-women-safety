import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (value: T | null) => void;
}

function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

/**
 * Runs an async loader on mount / when deps change, exposing loading + error state and a
 * manual `reload`. Stale responses are discarded so fast route changes cannot clobber state.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    setLoading(true);
    setError(null);

    loaderRef
      .current()
      .then((result) => {
        if (id !== runId.current) return;
        setData(result);
      })
      .catch((err) => {
        if (id !== runId.current) return;
        setError(toMessage(err));
      })
      .finally(() => {
        if (id !== runId.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload, setData };
}