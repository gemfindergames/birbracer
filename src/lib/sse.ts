// ─────────────────────────────────────────────
// BirbRacer — SSE Manager
// ─────────────────────────────────────────────
//
// Simple pub/sub for Server-Sent Events.
// Each race has its own channel.
// Clients subscribe when they open the SSE endpoint.
// Server publishes events when state changes.
// ─────────────────────────────────────────────

import { SSEEvent, SSEEventType } from "@/types";

type SSECallback = (event: SSEEvent) => void;

interface ChannelSubscribers {
  [clientId: string]: SSECallback;
}

interface SSEChannels {
  [raceId: string]: ChannelSubscribers;
}

class SSEManager {
  private channels: SSEChannels = {};
  private clientCounter = 0;

  // Subscribe a client to a race channel
  subscribe(raceId: string, callback: SSECallback): string {
    if (!this.channels[raceId]) {
      this.channels[raceId] = {};
    }

    const clientId = `client_${++this.clientCounter}`;
    this.channels[raceId][clientId] = callback;

    console.log(
      `[SSE] Client ${clientId} subscribed to race ${raceId} (${
        Object.keys(this.channels[raceId]).length
      } total)`
    );

    return clientId;
  }

  // Unsubscribe a client
  unsubscribe(raceId: string, clientId: string): void {
    if (this.channels[raceId]) {
      delete this.channels[raceId][clientId];

      // Clean up empty channels
      if (Object.keys(this.channels[raceId]).length === 0) {
        delete this.channels[raceId];
      }

      console.log(`[SSE] Client ${clientId} unsubscribed from race ${raceId}`);
    }
  }

  // Publish an event to all clients in a race channel
  publish(raceId: string, type: SSEEventType, data: unknown): void {
    const channel = this.channels[raceId];
    if (!channel) return;

    const event: SSEEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    const subscribers = Object.values(channel);
    for (const callback of subscribers) {
      try {
        callback(event);
      } catch (err) {
        console.error("[SSE] Error sending to client:", err);
      }
    }
  }

  // Broadcast to ALL channels (e.g., race list updates)
  broadcast(type: SSEEventType, data: unknown): void {
    for (const raceId of Object.keys(this.channels)) {
      this.publish(raceId, type, data);
    }
  }

  // Get subscriber count for a race
  getSubscriberCount(raceId: string): number {
    return this.channels[raceId]
      ? Object.keys(this.channels[raceId]).length
      : 0;
  }

  // Get all active race IDs
  getActiveChannels(): string[] {
    return Object.keys(this.channels);
  }
}

// Singleton — survives hot reloads in dev
const globalForSSE = globalThis as unknown as {
  sseManager: SSEManager | undefined;
};

export const sseManager =
  globalForSSE.sseManager ?? new SSEManager();

if (process.env.NODE_ENV !== "production") {
  globalForSSE.sseManager = sseManager;
}
