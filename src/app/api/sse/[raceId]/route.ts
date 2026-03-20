// GET /api/sse/[raceId] — SSE stream for live race updates
import { sseManager } from "@/lib/sse";
import { SSEEvent } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { raceId: string } }
) {
  const { raceId } = params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const connectMsg = `data: ${JSON.stringify({
        type: "connected",
        data: { raceId },
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // Subscribe to race events
      const clientId = sseManager.subscribe(raceId, (event: SSEEvent) => {
        try {
          const msg = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(msg));
        } catch {
          // Client disconnected
          sseManager.unsubscribe(raceId, clientId);
        }
      });

      // Heartbeat every 15 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({
            type: "ping",
            data: null,
            timestamp: Date.now(),
          })}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch {
          clearInterval(heartbeat);
          sseManager.unsubscribe(raceId, clientId);
        }
      }, 15000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        sseManager.unsubscribe(raceId, clientId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
