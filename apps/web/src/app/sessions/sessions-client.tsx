"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type Hall, type Session } from "@/lib/api";
import { formatLocalDateTime, toDateTimeLocalValue, toIsoFromDateTimeLocal } from "@/lib/datetime";
import { BookingsDialog } from "./widgets/bookings-dialog";

type SessionFormState = {
  movieTitle: string;
  startsAtLocal: string;
  durationHours: string;
  durationMinutes: string;
  hallId: string;
};

const EMPTY_HALLS: Hall[] = [];
const EMPTY_SESSIONS: Session[] = [];

const emptySessionForm = (halls: Hall[]): SessionFormState => ({
  movieTitle: "",
  startsAtLocal: "",
  durationHours: "2",
  durationMinutes: "0",
  hallId: halls[0]?.id ?? "",
});

const isSessionFormValid = (s: SessionFormState) => {
  const hours = Number(s.durationHours);
  const minutes = Number(s.durationMinutes);
  return (
    s.movieTitle.trim().length > 0 &&
    s.startsAtLocal.trim().length > 0 &&
    s.hallId.trim().length > 0 &&
    Number.isFinite(hours) &&
    Number.isFinite(minutes) &&
    hours >= 0 &&
    minutes >= 0 &&
    minutes <= 59 &&
    hours * 60 + minutes > 0
  );
};

export function SessionsClient() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const hallsQuery = useQuery({
    queryKey: ["halls"],
    queryFn: api.listHalls,
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: api.listSessions,
  });

  const halls = hallsQuery.data?.halls ?? EMPTY_HALLS;
  const sessions = sessionsQuery.data?.sessions ?? EMPTY_SESSIONS;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createForm, setCreateForm] = useState<SessionFormState>(() => emptySessionForm(halls));
  const [editForm, setEditForm] = useState<SessionFormState>(() => emptySessionForm(halls));
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);

  const sameMovieSessions = useMemo(() => {
    if (!selectedSession) return [];
    return sessions.filter((s) => s.movieTitle === selectedSession.movieTitle && s.id !== selectedSession.id);
  }, [selectedSession, sessions]);

  const totalBookings = useMemo(
    () => sessions.reduce((sum, session) => sum + (session.bookingsCount ?? 0), 0),
    [sessions],
  );
  const totalTickets = useMemo(
    () => sessions.reduce((sum, session) => sum + (session.bookedTickets ?? 0), 0),
    [sessions],
  );

  const createSession = useMutation({
    mutationFn: async (state: SessionFormState) => {
      return api.createSession({
        movieTitle: state.movieTitle,
        hallId: state.hallId,
        startsAt: toIsoFromDateTimeLocal(state.startsAtLocal),
        duration: { hours: Number(state.durationHours), minutes: Number(state.durationMinutes) },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Сеанс добавлен");
      setCreateOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Не удалось добавить сеанс");
    },
  });

  const updateSession = useMutation({
    mutationFn: async (args: { id: string; state: SessionFormState }) => {
      return api.updateSession(args.id, {
        movieTitle: args.state.movieTitle,
        hallId: args.state.hallId,
        startsAt: toIsoFromDateTimeLocal(args.state.startsAtLocal),
        duration: { hours: Number(args.state.durationHours), minutes: Number(args.state.durationMinutes) },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Сеанс обновлен");
      setEditOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Не удалось обновить сеанс");
    },
  });

  const deleteSession = useMutation({
    mutationFn: api.deleteSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Сеанс удален");
      if (selectedSession) setSelectedSession(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Не удалось удалить сеанс");
    },
  });

  const onOpenCreate = () => {
    setCreateForm(emptySessionForm(halls));
    setCreateOpen(true);
  };

  const onOpenEdit = (session: Session) => {
    setEditId(session.id);
    setEditForm({
      movieTitle: session.movieTitle,
      hallId: session.hall.id,
      startsAtLocal: toDateTimeLocalValue(session.startsAt),
      durationHours: String(Math.floor(session.durationMinutes / 60)),
      durationMinutes: String(session.durationMinutes % 60),
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Сеансы</h1>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={onOpenCreate} disabled={halls.length === 0}>
                Добавить сеанс
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <div className="flex items-start justify-between gap-4">
              <DialogHeader>
                <DialogTitle className="text-2xl">Новый сеанс</DialogTitle>
                <p className="text-sm text-muted-foreground">Заполни параметры показа и выбери зал.</p>
              </DialogHeader>
            </div>
            <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
              <SessionForm halls={halls} state={createForm} onChange={setCreateForm} />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setCreateOpen(false)}>
                Отмена
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => createSession.mutate(createForm)}
                disabled={createSession.isPending || !isSessionFormValid(createForm)}
              >
                Сохранить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-white/70 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Всего сеансов</div>
            <div className="mt-2 text-2xl font-semibold">{sessions.length}</div>
          </div>
          <div className="rounded-xl border bg-white/70 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Залов доступно</div>
            <div className="mt-2 text-2xl font-semibold">{halls.length}</div>
          </div>
          <div className="rounded-xl border bg-white/70 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Билетов продано</div>
            <div className="mt-2 text-2xl font-semibold">{totalTickets}</div>
            <div className="text-xs text-muted-foreground">Броней: {totalBookings}</div>
          </div>
        </div>
      </div>

      {hallsQuery.isLoading || sessionsQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Загрузка…</div>
      ) : hallsQuery.isError || sessionsQuery.isError ? (
        <div className="text-sm text-destructive">Ошибка загрузки данных</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr className="[&>th]:px-5 [&>th]:py-4 [&>th]:text-left [&>th]:font-medium">
                <th>Фильм</th>
                <th>Начало</th>
                <th>Длительность</th>
                <th>Зал</th>
                <th>Брони</th>
                <th className="w-[1%]"></th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-muted/60">
                {sessions.map((s) => (
                  <tr key={s.id} className="group hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <div className="text-base font-semibold">{s.movieTitle}</div>
                      <div className="text-xs text-muted-foreground">ID: {s.id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="whitespace-nowrap">{formatLocalDateTime(s.startsAt)}</span>
                    </td>
                    <td className="px-5 py-4">
                      {Math.floor(s.durationMinutes / 60)}ч {s.durationMinutes % 60}м
                    </td>
                    <td className="px-5 py-4">
                      <div>{s.hall.name}</div>
                      <div className="text-xs text-muted-foreground">ID: {s.hall.id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-base font-semibold">{s.bookedTickets ?? 0} бил.</div>
                      <div className="text-xs text-muted-foreground">Броней: {s.bookingsCount ?? 0}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:justify-end">
                        <Button size="sm" variant="secondary" className="w-full md:w-auto" onClick={() => setSelectedSession(s)}>
                          Брони
                        </Button>
                        <Button size="sm" variant="secondary" className="w-full md:w-auto" onClick={() => onOpenEdit(s)}>
                          Изменить
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full md:w-auto"
                          onClick={() => setDeleteTarget(s)}
                          disabled={deleteSession.isPending}
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-muted-foreground" colSpan={6}>
                      Сеансов пока нет
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-start justify-between gap-4">
            <DialogHeader>
              <DialogTitle className="text-2xl">Редактирование сеанса</DialogTitle>
              <p className="text-sm text-muted-foreground">Обнови расписание, зал или длительность.</p>
            </DialogHeader>
          </div>
          <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
            <SessionForm halls={halls} state={editForm} onChange={setEditForm} />
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setEditOpen(false)}>
              Отмена
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                if (!editId) return;
                updateSession.mutate({ id: editId, state: editForm });
              }}
              disabled={!editId || updateSession.isPending || !isSessionFormValid(editForm)}
            >
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BookingsDialog
        open={selectedSession !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
        session={selectedSession}
        sameMovieSessions={sameMovieSessions}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Удалить сеанс?"
        description={
          deleteTarget
            ? `Сеанс «${deleteTarget.movieTitle}» будет удален вместе с бронями.`
            : undefined
        }
        confirmLabel="Удалить"
        confirmDisabled={deleteSession.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const targetId = deleteTarget.id;
          setDeleteTarget(null);
          deleteSession.mutate(targetId);
        }}
      />
    </div>
  );
}

function SessionForm(props: {
  halls: Hall[];
  state: SessionFormState;
  onChange: (next: SessionFormState) => void;
}) {
  const { halls, state, onChange } = props;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="movieTitle">Наименование фильма</Label>
        <Input
          id="movieTitle"
          value={state.movieTitle}
          onChange={(e) => onChange({ ...state, movieTitle: e.target.value })}
          placeholder="Например: Интерстеллар"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="startsAt">Дата и время</Label>
        <Input
          id="startsAt"
          type="datetime-local"
          value={state.startsAtLocal}
          onChange={(e) => onChange({ ...state, startsAtLocal: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="durationHours">Длительность (часы)</Label>
          <Input
            id="durationHours"
            type="number"
            min={0}
            value={state.durationHours}
            onChange={(e) => onChange({ ...state, durationHours: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="durationMinutes">Длительность (минуты)</Label>
          <Input
            id="durationMinutes"
            type="number"
            min={0}
            max={59}
            value={state.durationMinutes}
            onChange={(e) => onChange({ ...state, durationMinutes: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Зал</Label>
        <Select value={state.hallId} onValueChange={(hallId) => onChange({ ...state, hallId })}>
          <SelectTrigger>
            <SelectValue placeholder="Выбери зал" />
          </SelectTrigger>
          <SelectContent>
            {halls.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name} (вместимость: {h.capacity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
