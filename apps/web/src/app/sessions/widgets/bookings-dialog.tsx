"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type Booking, type Session } from "@/lib/api";

const EMPTY_BOOKINGS: Booking[] = [];

export function BookingsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | null;
  sameMovieSessions: Session[];
}) {
  const { open, onOpenChange, session, sameMovieSessions } = props;
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ["bookings", session?.id],
    queryFn: () => {
      if (!session) throw new Error("No session");
      return api.listBookings(session.id);
    },
    enabled: Boolean(session),
  });

  const [fullName, setFullName] = useState("");
  const [tickets, setTickets] = useState("1");

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No session");
      return api.createBooking({ sessionId: session.id, fullName, tickets: Number(tickets) });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bookings", session?.id] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
      toast.success("Бронь сохранена");
      setFullName("");
      setTickets("1");
    },
    onError: (err) => toast.warning(err instanceof Error ? err.message : "Не удалось добавить бронь"),
  });

  const deleteBooking = useMutation({
    mutationFn: api.deleteBooking,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bookings", session?.id] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
      toast.success("Бронь удалена");
    },
    onError: (err) => toast.warning(err instanceof Error ? err.message : "Не удалось удалить бронь"),
  });

  const moveBooking = useMutation({
    mutationFn: async (args: { bookingId: string; targetSessionId: string }) =>
      api.moveBooking(args.bookingId, args.targetSessionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bookings", session?.id] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
      toast.success("Бронь перенесена");
    },
    onError: (err) => toast.warning(err instanceof Error ? err.message : "Не удалось перенести бронь"),
  });

  const updateBooking = useMutation({
    mutationFn: async (args: { id: string; fullName: string; tickets: number }) =>
      api.updateBooking(args.id, { fullName: args.fullName, tickets: args.tickets }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bookings", session?.id] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
      toast.success("Бронь обновлена");
      setEditing(null);
    },
    onError: (err) => toast.warning(err instanceof Error ? err.message : "Не удалось обновить бронь"),
  });

  const [editing, setEditing] = useState<null | { id: string; fullName: string; tickets: string }>(null);

  const bookings = bookingsQuery.data?.bookings ?? EMPTY_BOOKINGS;
  const totalTickets = useMemo(() => bookings.reduce((sum, b) => sum + b.tickets, 0), [bookings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Брони — {session?.movieTitle ?? ""} {session ? `(${session.hall.name})` : ""}
          </DialogTitle>
        </DialogHeader>

        {!session ? null : (
          <div className="space-y-6">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium">Добавить бронь</div>
                <div className="text-xs text-muted-foreground">Всего забронировано: {totalTickets}</div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="fullName">ФИО</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tickets">Билеты</Label>
                  <Input
                    id="tickets"
                    type="number"
                    min={1}
                    value={tickets}
                    onChange={(e) => setTickets(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => createBooking.mutate()} disabled={createBooking.isPending}>
                  Сохранить
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
                    <th>ФИО</th>
                    <th>Билеты</th>
                    <th className="w-[1%]"></th>
                  </tr>
                </thead>
                <tbody className="[&>tr]:border-t">
                  {bookings.map((b) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      sameMovieSessions={sameMovieSessions}
                      onEdit={() => setEditing({ id: b.id, fullName: b.fullName, tickets: String(b.tickets) })}
                      onDelete={() => deleteBooking.mutate(b.id)}
                      onMove={(targetSessionId) => moveBooking.mutate({ bookingId: b.id, targetSessionId })}
                    />
                  ))}
                  {bookings.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={3}>
                        Броней пока нет
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {editing ? (
              <div className="rounded-lg border p-4">
                <div className="mb-3 text-sm font-medium">Редактировать бронь</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="editFullName">ФИО</Label>
                    <Input
                      id="editFullName"
                      value={editing.fullName}
                      onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editTickets">Билеты</Label>
                    <Input
                      id="editTickets"
                      type="number"
                      min={1}
                      value={editing.tickets}
                      onChange={(e) => setEditing({ ...editing, tickets: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setEditing(null)}>
                    Отмена
                  </Button>
                  <Button
                    onClick={() =>
                      updateBooking.mutate({
                        id: editing.id,
                        fullName: editing.fullName,
                        tickets: Number(editing.tickets),
                      })
                    }
                    disabled={updateBooking.isPending}
                  >
                    Сохранить
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookingRow(props: {
  booking: Booking;
  sameMovieSessions: Session[];
  onEdit: () => void;
  onDelete: () => void;
  onMove: (targetSessionId: string) => void;
}) {
  const { booking, sameMovieSessions, onEdit, onDelete, onMove } = props;
  const [targetSessionId, setTargetSessionId] = useState<string>(sameMovieSessions[0]?.id ?? "");

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="font-medium">{booking.fullName}</div>
        <div className="text-xs text-muted-foreground">ID: {booking.id}</div>
      </td>
      <td className="px-4 py-3">{booking.tickets}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onEdit}>
            Изменить
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Удалить
          </Button>

          <div className="flex items-center gap-2">
            <Select value={targetSessionId} onValueChange={setTargetSessionId} disabled={sameMovieSessions.length === 0}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Куда перенести" />
              </SelectTrigger>
              <SelectContent>
                {sameMovieSessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.hall.name} — {new Date(s.startsAt).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              onClick={() => {
                if (!targetSessionId) return;
                onMove(targetSessionId);
              }}
              disabled={!targetSessionId || sameMovieSessions.length === 0}
            >
              Перенести
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}
