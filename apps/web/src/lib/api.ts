import { z } from "zod";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const hallSchema = z.object({ id: z.string(), name: z.string(), capacity: z.number().int() });
const sessionSchema = z.object({
  id: z.string(),
  movieTitle: z.string(),
  startsAt: z.string(),
  durationMinutes: z.number().int(),
  hall: hallSchema,
  bookingsCount: z.number().int().optional(),
  bookedTickets: z.number().int().optional(),
});
const bookingSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  fullName: z.string(),
  tickets: z.number().int(),
});

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

async function http<T>(path: string, init?: RequestInit, schema?: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as unknown;
      if (typeof json === "string") {
        const nested = JSON.parse(json) as unknown;
        const parsedNested = apiErrorSchema.safeParse(nested);
        if (parsedNested.success) throw new Error(parsedNested.data.error.message);
      }
      const parsed = apiErrorSchema.safeParse(json);
      if (parsed.success) throw new Error(parsed.data.error.message);
    } catch {
      // ignore
    }

    const messageMatch = text.match(/"message"\s*:\s*"([^"]+)"/);
    if (messageMatch?.[1]) {
      throw new Error(messageMatch[1]);
    }
    throw new Error(text || "Не удалось выполнить запрос");
  }

  const data = (await res.json()) as unknown;
  if (schema) return schema.parse(data);
  return data as T;
}

export type Hall = { id: string; name: string; capacity: number };
export type Session = {
  id: string;
  movieTitle: string;
  startsAt: string;
  durationMinutes: number;
  hall: Hall;
  bookingsCount?: number;
  bookedTickets?: number;
};
export type Booking = { id: string; sessionId: string; fullName: string; tickets: number };

const hallsResponse = z.object({ halls: z.array(hallSchema) });
const sessionsResponse = z.object({ sessions: z.array(sessionSchema) });
const bookingsResponse = z.object({ bookings: z.array(bookingSchema) });
const sessionResponse = z.object({ session: sessionSchema });
const bookingResponse = z.object({ booking: bookingSchema });

export const api = {
  listHalls: () => http("/api/halls", undefined, hallsResponse),
  listSessions: () => http("/api/sessions", undefined, sessionsResponse),
  createSession: (body: { movieTitle: string; startsAt: string; hallId: string; duration: { hours: number; minutes: number } }) =>
    http("/api/sessions", { method: "POST", body: JSON.stringify(body) }, sessionResponse),
  updateSession: (id: string, body: { movieTitle: string; startsAt: string; hallId: string; duration: { hours: number; minutes: number } }) =>
    http(`/api/sessions/${id}`, { method: "PUT", body: JSON.stringify(body) }, sessionResponse),
  deleteSession: (id: string) => http<void>(`/api/sessions/${id}`, { method: "DELETE" }),
  listBookings: (sessionId: string) => http(`/api/sessions/${sessionId}/bookings`, undefined, bookingsResponse),
  createBooking: (body: { sessionId: string; fullName: string; tickets: number }) =>
    http(`/api/bookings`, { method: "POST", body: JSON.stringify(body) }, bookingResponse),
  updateBooking: (id: string, body: { fullName: string; tickets: number }) =>
    http(`/api/bookings/${id}`, { method: "PUT", body: JSON.stringify(body) }, bookingResponse),
  deleteBooking: (id: string) => http<void>(`/api/bookings/${id}`, { method: "DELETE" }),
  moveBooking: (id: string, targetSessionId: string) =>
    http(`/api/bookings/${id}/move`, { method: "POST", body: JSON.stringify({ targetSessionId }) }, bookingResponse),
};
