import { HttpResponse } from "msw";
import type { AskSseEvent, ErrorBody } from "@omnidoc/contracts";

export class MockHttpError extends Error {
  constructor(
    public status: number,
    public body: ErrorBody,
  ) {
    super(body.detail);
  }
}
export function fail(
  status: number,
  code: ErrorBody["code"],
  detail: string,
): never {
  throw new MockHttpError(status, { code, detail });
}
export function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    if (object(value)) return value;
  } catch {
    /* Return the contract envelope, never parser details. */
  }
  return fail(400, "validation", "A JSON object is required.");
}
export function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    fail(400, "validation", "A nonempty string is required.");
  return value;
}
export function onlyFields(value: Record<string, unknown>, fields: string[]) {
  if (Object.keys(value).some((key) => !fields.includes(key)))
    fail(400, "validation", "Unexpected request field.");
}
export function serializeAskEvents(events: readonly AskSseEvent[]): string {
  return events
    .map(
      ({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
    )
    .join("");
}
export function streamResponse(
  events: readonly AskSseEvent[],
  signal: AbortSignal,
) {
  let index = 0;
  return new HttpResponse(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (signal.aborted || index === events.length) {
          controller.close();
          return;
        }
        controller.enqueue(
          new TextEncoder().encode(serializeAskEvents([events[index++]])),
        );
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    },
  );
}
