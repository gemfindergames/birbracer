"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { SSEEvent, SSEEventType } from "@/types";

interface UseSSEOptions {
  raceId: string;
  enabled?: boolean;
  onEvent?: (event: SSEEvent) => void;
}

export function useSSE({ raceId, enabled = true, onEvent }: UseSSEOptions) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callback ref current without triggering reconnect
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!raceId || !enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/sse/${raceId}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      console.log(`[SSE] Connected to race ${raceId}`);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data);
        setLastEvent(parsed);
        onEventRef.current?.(parsed);
      } catch (err) {
        console.error("[SSE] Parse error:", err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`[SSE] Reconnecting to race ${raceId}...`);
        connect();
      }, 3000);
    };
  }, [raceId, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setConnected(false);
    };
  }, [connect]);

  return { connected, lastEvent };
}

// Hook to listen for specific event types
export function useSSEEvent(
  raceId: string,
  eventType: SSEEventType,
  callback: (data: unknown) => void,
  enabled = true
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useSSE({
    raceId,
    enabled,
    onEvent: (event) => {
      if (event.type === eventType) {
        callbackRef.current(event.data);
      }
    },
  });
}
