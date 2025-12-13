import { useEffect, useMemo, useState } from "react";
import { listAvailability, rescheduleAppointment } from "../api.js";

export default function RescheduleModal({ appt, onClose, onSuccess }) {
  const [dateISO, setDateISO] = useState(toISO(new Date(appt.start_at || appt.whenISO)));
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const serviceId = appt.service?.id || appt.service_id;

  useEffect(() => {
    if (!serviceId) return;
    let alive = true;
    (async () => {
      const s = await listAvailability({
        salonId: appt.salon_id || appt.salon?.id,
        employeeId: appt.barber_id || appt.employee?.id,
        serviceId,
        dateISO,
      });
      if (!alive) return;
      const tz = appt.salon?.timezone || "America/New_York";
      const enriched = (s || []).map((row) => ({ ...row, timezone: row.timezone || tz }));
      setSlots(enriched);
      setSlot(null);
    })();
    return () => { alive = false; };
  }, [appt.salon?.id, appt.employee?.id, appt.salon_id, appt.barber_id, dateISO, serviceId]);

  async function confirm() {
    if (!slot) return;
    setSaving(true);
    const res = await rescheduleAppointment(appt.id, {
      salon_id: appt.salon_id || appt.salon?.id,
      barber_id: appt.barber_id || appt.employee?.id,
      start_at: slot.start_at,
      end_at: slot.end_at,
    });
    setSaving(false);
    onSuccess(res);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-16 mx-auto w-[min(760px,92vw)] rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Reschedule • {appt.salon?.name}</div>
          <button onClick={onClose} className="rounded-md border px-3 py-1 hover:bg-gray-50">Close</button>
        </div>
        <div className="p-6 space-y-6">
          <div className="text-sm text-gray-600">
            Current: {new Date(appt.start_at || appt.whenISO).toLocaleString()}
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="rounded-xl border p-3">
              <Calendar dateISO={dateISO} onDateISO={setDateISO} />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-2">Available Time Slots</div>
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {slots.map((s) => (
                    <button
                      key={s.start_at}
                      onClick={() => setSlot(s)}
                      className={`rounded-xl border px-4 py-2 text-sm ${
                        slot?.start_at === s.start_at ? "ring-2 ring-violet-600 border-violet-600" : "hover:bg-gray-50"
                      }`}
                    >
                      {s.label || formatTimeInTz(s.start_at, s.timezone || appt.salon?.timezone || "America/New_York")}
                    </button>
                  ))}
                  {slots.length === 0 && (
                    <div className="text-sm text-gray-500 col-span-full">No openings for this day.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-xl border px-4 py-2 hover:bg-gray-50">Cancel</button>
            <button
              onClick={confirm}
              disabled={!slot || saving}
              className="rounded-xl bg-gray-900 text-white px-4 py-2 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Confirm New Time"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Calendar({ dateISO, onDateISO }) {
  const d = parseISODate(dateISO);
  const ym = new Date(d.getFullYear(), d.getMonth(), 1);
  const days = buildCalendarDays(dateISO);
  const prev = () => onDateISO(toISO(new Date(d.getFullYear(), d.getMonth() - 1, d.getDate())));
  const next = () => onDateISO(toISO(new Date(d.getFullYear(), d.getMonth() + 1, d.getDate())));
  return (
    <div className="w-72">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="rounded-md border px-2 py-1">&lt;</button>
        <div className="font-medium">{ym.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        <button onClick={next} className="rounded-md border px-2 py-1">&gt;</button>
      </div>
      <div className="grid grid-cols-7 text-xs text-gray-500 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((w) => <div key={w} className="text-center py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((cell) => (
          <button
            key={cell.key}
            disabled={!cell.currentMonth || cell.past}
            onClick={() => onDateISO(cell.iso)}
            className={`h-8 rounded-md text-sm ${
              cell.iso === dateISO ? "bg-black text-white" : "border hover:bg-gray-50"
            } ${!cell.currentMonth || cell.past ? "text-gray-400 border-gray-200" : ""}`}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildCalendarDays(dateISO) {
  const d = parseISODate(dateISO);
  const y = d.getFullYear(), m = d.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(y, m, 1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    cells.push({
      key: dt.toISOString(),
      iso: toISO(dt),
      day: dt.getDate(),
      currentMonth: dt.getMonth() === m,
      past: dt < stripTime(new Date()),
    });
  }
  return cells;
}
function toISO(d){
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function stripTime(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function parseISODate(dateISO){ const [y,m,d]=dateISO.split("-").map(Number); return new Date(y||0,(m||1)-1,d||1); }
function formatTimeInTz(iso, tz = "America/New_York") {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch (e) {
    return "";
  }
}
