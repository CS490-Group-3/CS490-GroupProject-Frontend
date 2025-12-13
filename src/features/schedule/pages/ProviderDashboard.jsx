import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarIcon,
  Clock,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  fetchAppointments,
  patchAppointment,
  cancelAppointment,
  fetchUnavailability,
  createUnavailability,
  deleteUnavailability,
  fetchAvailability,
  notifyRunningLate,
  getMyBarberSalon,
} from "../api.js";
import { useAuth } from "../../auth/auth-provider.jsx";
import NotificationsPage from "../../notifications/pages/NotificationsPage.jsx";
import { Card } from "../../../shared/ui/card.jsx";
import { Building2 } from "lucide-react";

const SLOT_DURATION_MINUTES = 60;
const DISPLAY_SLOT_MINUTES = 15;
const BLOCK_INTERVAL_MINUTES = 15;

const toDisplayTime = (time24) => {
  if (!time24) return "12:00 PM";
  const [hourStr, minuteStr] = time24.split(":");
  let hour = Number.parseInt(hourStr, 10);
  if (Number.isNaN(hour)) return time24;
  const minute = minuteStr ?? "00";
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute.slice(0, 2)} ${period}`;
};

const isoToDateAndTime = (iso, tzName = "America/New_York") => {
  if (!iso) return { date: "", time: "", display: "" };
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return { date: "", time: "", display: "" };

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tzName,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dt);
  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tzName,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(dt);
  const display = new Intl.DateTimeFormat("en-US", {
    timeZone: tzName,
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);

  const getPart = (parts, type) => parts.find((p) => p.type === type)?.value || "";
  const date = `${getPart(dateParts, "year")}-${getPart(dateParts, "month")}-${getPart(dateParts, "day")}`;
  const hours = getPart(timeParts, "hour");
  const minutes = getPart(timeParts, "minute");

  return { date, time: `${hours}:${minutes}:00`, display };
};

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date(NaN);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

  const isPastAppointment = (appt) => {
    if (!appt) return false;
    const start = appt.start_at ? new Date(appt.start_at) : parseLocalDate(appt.appointment_date);
    return start < new Date();
  };
  const isInProgressAppointment = (appt) => {
    if (!appt?.start_at) return false;
    const now = new Date();
    const start = new Date(appt.start_at);
    const end = appt.end_at
      ? new Date(appt.end_at)
      : new Date(start.getTime() + (appt.duration_minutes || SLOT_DURATION_MINUTES) * 60 * 1000);
    return start <= now && now < end && !isCanceled(appt);
  };

const formatDateInTz = (d, tzName = "America/New_York") => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tzName,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const getPart = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

const formatClock = (d) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);

const isCanceled = (appt) => (appt?.status || "").toLowerCase() === "cancelled";
const formatMinutes = (m) => `${m} min`;

const normalizeAppointment = (raw) => {
  const tzName = raw?.salon?.timezone || raw?.timezone || "America/New_York";
  const startParts = isoToDateAndTime(raw?.start_at || raw?.start_time, tzName);
  const endParts = isoToDateAndTime(raw?.end_at || raw?.end_time, tzName);
  const durationMinutes =
    raw?.service?.duration_minutes ??
    raw?.duration_minutes ??
    (raw?.end_at && raw?.start_at
      ? Math.max(
          1,
          Math.round(
            (new Date(raw.end_at).getTime() - new Date(raw.start_at).getTime()) /
              (60 * 1000)
          )
        )
      : 0);

  const startDt = raw?.start_at ? new Date(raw.start_at) : null;
  const endComputed =
    startDt && durationMinutes
      ? new Date(startDt.getTime() + durationMinutes * 60 * 1000)
      : raw?.end_at
      ? new Date(raw.end_at)
      : null;

  const price =
    Number.parseFloat(raw?.price) ||
    Number.parseFloat(raw?.total_price) ||
    Number.parseFloat(raw?.service?.price) ||
    0;

  return {
    ...raw,
    id: raw?.id ?? raw?.appointment_id ?? `${startParts.date}-${startParts.time}`,
    appointment_date: startParts.date,
    start_time: startParts.time,
    end_time: endParts.time,
    displayTime: startParts.display || toDisplayTime(startParts.time),
    status: raw?.status ?? "scheduled",
    notes: raw?.notes ?? "",
    price,
    start_at: raw?.start_at,
    end_at: raw?.end_at,
    timezone: tzName,
    duration_minutes: durationMinutes || null,
    end_display: endComputed ? formatClock(endComputed) : endParts.display,
  };
};

const slotToRange = (dateObj, slotLabel, durationMinutes = SLOT_DURATION_MINUTES) => {
  const [time, period] = slotLabel.split(" ");
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number.parseInt(hourStr, 10) || 0;
  const minute = Number.parseInt(minuteStr || "0", 10) || 0;
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  const start = new Date(dateObj);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
};

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [isInSalon, setIsInSalon] = useState(null);
  const [checkingSalon, setCheckingSalon] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [blockedWindows, setBlockedWindows] = useState([]);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editFormData, setEditFormData] = useState({
    time: "",
    notes: "",
    status: "scheduled",
  });
  const [blockDuration, setBlockDuration] = useState(15);
  const [conflictError, setConflictError] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [weeklyAvailability, setWeeklyAvailability] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [notifyingLate, setNotifyingLate] = useState(null);
  const [notifiedAppointments, setNotifiedAppointments] = useState(new Set());

  // Check if barber is in a salon before loading any data
  useEffect(() => {
    if (user?.role !== "barber") {
      setIsInSalon(true);
      setCheckingSalon(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        await getMyBarberSalon();
        if (!alive) return;
        setIsInSalon(true);
      } catch (err) {
        if (!alive) return;
        if (err.response?.status === 404 || err.message?.includes("not associated") || err.message?.includes("404")) {
          setIsInSalon(false);
        } else {
          setIsInSalon(true);
        }
      } finally {
        if (alive) setCheckingSalon(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.role]);

  const loadAppointments = useCallback(async () => {
    if (user?.role === "barber" && !isInSalon) return;
    
    setLoadingAppointments(true);
    try {
      const all = [];
      const pageSize = 100;
      let page = 1;
      while (true) {
        const response = await fetchAppointments({
          when: "all",
          limit: pageSize,
          page,
        });
        const rows = Array.isArray(response?.appointments)
          ? response.appointments
          : Array.isArray(response)
          ? response
          : [];
        all.push(...rows);
        if (rows.length < pageSize) break;
        page += 1;
      }
      setAppointments(all.map(normalizeAppointment));
    } catch (err) {
      console.error("Failed to load appointments", err);
      setAppointmentsError(
        err instanceof Error
          ? err.message
          : "Failed to load appointments for this barber."
      );
    } finally {
      setLoadingAppointments(false);
    }
  }, [user?.role, isInSalon]);

  useEffect(() => {
    if (!checkingSalon && (user?.role !== "barber" || isInSalon)) {
      loadAppointments();
    }
  }, [loadAppointments, checkingSalon, user?.role, isInSalon]);

  const loadBlocks = useCallback(async () => {
    if (user?.role === "barber" && !isInSalon) return;
    
    setLoadingBlocks(true);
    try {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const res = await fetchUnavailability({
        start_from: dayStart.toISOString(),
        end_before: dayEnd.toISOString(),
      });
      const list = Array.isArray(res?.blocks) ? res.blocks : [];
      setBlockedWindows(list);
    } catch (err) {
      setBlockedWindows([]);
    } finally {
      setLoadingBlocks(false);
    }
  }, [selectedDate, user?.role, isInSalon]);

  useEffect(() => {
    if (!checkingSalon && (user?.role !== "barber" || isInSalon)) {
      loadBlocks();
    }
  }, [loadBlocks, checkingSalon, user?.role, isInSalon]);

  useEffect(() => {
    if (user?.role === "barber" && !isInSalon) return;
    
    setLoadingAvailability(true);
    fetchAvailability()
      .then((res) => {
        const fetched = Array.isArray(res?.availability) ? res.availability : [];
        setWeeklyAvailability(fetched);
      })
      .catch(() => setWeeklyAvailability([]))
      .finally(() => setLoadingAvailability(false));
  }, [user?.role, isInSalon]);

  const scheduleTz = useMemo(
    () =>
      appointments.find((a) => a.timezone)?.timezone ||
      appointments[0]?.timezone ||
      "America/New_York",
    [appointments]
  );

  const selectedDateISO = useMemo(
    () => formatDateInTz(selectedDate, scheduleTz),
    [selectedDate, scheduleTz]
  );

  const todayAppointments = appointments.filter(
    (a) => a.appointment_date === selectedDateISO
  );

  const selectedAppointments = todayAppointments.slice();
  const inProgressAppointments = selectedAppointments.filter(isInProgressAppointment);
  const upcomingAppointments = selectedAppointments.filter(
    (apt) => !isCanceled(apt) && !isPastAppointment(apt) && !isInProgressAppointment(apt)
  );
  const pastAppointments = selectedAppointments.filter(
    (apt) => !isCanceled(apt) && isPastAppointment(apt) && !isInProgressAppointment(apt)
  );
  const cancelledAppointments = selectedAppointments.filter((apt) => isCanceled(apt));

  const sortByStart = (list) =>
    list.slice().sort((a, b) => {
      const aStart = a.start_at ? new Date(a.start_at).getTime() : 0;
      const bStart = b.start_at ? new Date(b.start_at).getTime() : 0;
      return aStart - bStart;
    });

  const availabilityByDow = useMemo(() => {
    const map = {};
    weeklyAvailability.forEach((entry) => {
      if (!entry) return;
      if (!entry.is_active) return;
      if (!entry.start_time || !entry.end_time) return;
      map[entry.day_of_week] = map[entry.day_of_week] || [];
      map[entry.day_of_week].push(entry);
    });
    return map;
  }, [weeklyAvailability]);

  const daySlots = useMemo(() => {
    const dow = selectedDate.getDay();
    const windows = availabilityByDow[dow] || [];
    const slots = [];
    windows.forEach((win) => {
      const [sh, sm = "0"] = String(win.start_time || "").split(":");
      const [eh, em = "0"] = String(win.end_time || "").split(":");
      const startWindow = new Date(selectedDate);
      startWindow.setHours(Number(sh) || 0, Number(sm) || 0, 0, 0);
      const endWindow = new Date(selectedDate);
      endWindow.setHours(Number(eh) || 0, Number(em) || 0, 0, 0);
      let cursor = new Date(startWindow);
      while (cursor < endWindow) {
        const slotEnd = new Date(cursor.getTime() + DISPLAY_SLOT_MINUTES * 60 * 1000);
        if (slotEnd > endWindow) break;
        const hh = cursor.getHours().toString().padStart(2, "0");
        const mm = cursor.getMinutes().toString().padStart(2, "0");
        slots.push({
          label: toDisplayTime(`${hh}:${mm}:00`),
          start: new Date(cursor),
          end: slotEnd,
          duration: DISPLAY_SLOT_MINUTES,
        });
        cursor = slotEnd;
      }
    });
    return slots;
  }, [availabilityByDow, selectedDate]);

  const blockSlots = useMemo(() => {
    const dow = selectedDate.getDay();
    const windows = availabilityByDow[dow] || [];
    const slots = [];
    windows.forEach((win) => {
      const [sh, sm = "0"] = String(win.start_time || "").split(":");
      const [eh, em = "0"] = String(win.end_time || "").split(":");
      const startWindow = new Date(selectedDate);
      startWindow.setHours(Number(sh) || 0, Number(sm) || 0, 0, 0);
      const endWindow = new Date(selectedDate);
      endWindow.setHours(Number(eh) || 0, Number(em) || 0, 0, 0);
      let cursor = new Date(startWindow);
      while (cursor < endWindow) {
        const slotEnd = new Date(cursor.getTime() + BLOCK_INTERVAL_MINUTES * 60 * 1000);
        if (slotEnd > endWindow) break;
        const hh = cursor.getHours().toString().padStart(2, "0");
        const mm = cursor.getMinutes().toString().padStart(2, "0");
        slots.push({
          label: toDisplayTime(`${hh}:${mm}:00`),
          start: new Date(cursor),
          end: slotEnd,
          windowStart: startWindow,
          windowEnd: endWindow,
        });
        cursor = slotEnd;
      }
    });
    return slots;
  }, [availabilityByDow, selectedDate]);

  // Show placeholder if barber not in salon
  if (checkingSalon) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === "barber" && !isInSalon) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="p-8 border-2 border-dashed border-gray-300">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Not Yet Added to a Salon
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                You haven't been added to a salon yet. Please contact the salon owner to add you to their salon.
                Once you're added, you'll be able to view your schedule, manage appointments, and set your availability here.
              </p>
            </div>
            <div className="pt-4">
              <p className="text-sm text-gray-500">
                If you believe this is an error, please reach out to your salon owner or administrator.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const handleDateClick = (dateNumber) => {
    if (dateNumber >= 1 && dateNumber <= 31 && !Number.isNaN(dateNumber)) {
      const newDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        dateNumber
      );
      setSelectedDate(newDate);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const getCalendarDates = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDay - 1; i >= 0; i -= 1) {
      days.push({
        date: prevMonthDays - i,
        month: -1,
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i += 1) {
      days.push({
        date: i,
        month: 0,
        isCurrentMonth: true,
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i += 1) {
      days.push({
        date: i,
        month: 1,
        isCurrentMonth: false,
      });
    }

    return days;
  };


  const renderSection = (title, items, statusOverride) => {
    if (!items.length) return null;
    const badgeClass =
      statusOverride === "upcoming"
        ? "bg-blue-100 text-blue-700"
        : statusOverride === "inprogress"
        ? "bg-amber-100 text-amber-800"
        : statusOverride === "cancelled"
        ? "bg-gray-200 text-gray-700"
        : "bg-gray-200 text-gray-700";

    return (
      <div className="border-b border-gray-200 pb-6 last:border-b-0">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">
              {items.length} appointment{items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{appointment.displayTime}</span>
                </div>
                                <div className="space-y-0.5">
                                  <p className="font-medium text-gray-900">
                                    {appointment?.customer?.name ||
                                      appointment?.customer_name ||
                                      "Customer"}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {appointment?.service?.name ||
                                      appointment?.service_name ||
                                      "Service details unavailable"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {appointment.duration_minutes
                                      ? `${appointment.duration_minutes} min${
                                          appointment.end_display ? ` • Ends at ${appointment.end_display}` : ""
                                        }`
                                      : ""}
                                  </p>
                                  {appointment.notes && (
                                    <p className="text-xs text-gray-600">
                                      Note: {appointment.notes}
                                    </p>
                                  )}
                                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-gray-800 text-white rounded text-sm font-medium">
                  ${appointment.price.toFixed(2)}
                </span>
                {appointment.payment_status && (
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    appointment.payment_status === "completed" ? "bg-green-100 text-green-700" : 
                    appointment.payment_status === "pending" ? "bg-yellow-100 text-yellow-700" : 
                    appointment.payment_status === "failed" ? "bg-red-100 text-red-700" : 
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {appointment.payment_status === "completed" ? "✓ Paid" : 
                     appointment.payment_status === "pending" ? "Pending" : 
                     appointment.payment_status === "failed" ? "Failed" : 
                     appointment.payment_status}
                  </span>
                )}
                <span className={`px-3 py-1 rounded text-sm font-medium capitalize ${badgeClass}`}>
                  {appointment.status.replace("_", " ")}
                </span>
                {!isCanceled(appointment) && (
                  <>
                    {!isPastAppointment(appointment) && (
                      <button
                        onClick={() => handleNotifyRunningLate(appointment.id)}
                        disabled={notifyingLate === appointment.id || savingEdit || notifiedAppointments.has(appointment.id)}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                        title={notifiedAppointments.has(appointment.id) ? "Customer already notified" : "Notify customer that you're running late"}
                      >
                        {notifyingLate === appointment.id ? "Sending..." : notifiedAppointments.has(appointment.id) ? "Notified" : "Notify: Running Late"}
                      </button>
                    )}
                    <button
                      onClick={() => handleEditAppointment(appointment)}
                      className="px-3 py-1.5 bg-gray-200 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={savingEdit}
                    >
                      Manage
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getSlotStatus = (slotOrLabel, durationMinutes = SLOT_DURATION_MINUTES) => {
    const label = typeof slotOrLabel === "string" ? slotOrLabel : slotOrLabel.label;
    let start;
    let end;
    let windowStart = null;
    let windowEnd = null;
    if (slotOrLabel && typeof slotOrLabel === "object" && slotOrLabel.start) {
      start = slotOrLabel.start;
      windowStart = slotOrLabel.windowStart || null;
      windowEnd = slotOrLabel.windowEnd || null;
      const dur = slotOrLabel.duration || durationMinutes;
      // Always compute end based on the intended duration, not the precomputed 15-min slot
      end = new Date(start.getTime() + dur * 60 * 1000);
    } else {
      const range = slotToRange(selectedDate, label, durationMinutes);
      start = range.start;
      end = range.end;
    }

    // If the requested interval would extend outside the availability window, treat as unavailable
    if (windowStart && start < windowStart) return "unavailable";
    if (windowEnd && end > windowEnd) return "unavailable";

    const hasAppointment = todayAppointments.find((a) => {
      const status = (a.status || "").toLowerCase();
      const blockingStatuses = new Set(["scheduled", "confirmed"]);
      if (!blockingStatuses.has(status)) return false;
      const aStart = a.start_at ? new Date(a.start_at) : null;
      const aEnd = a.end_at
        ? new Date(a.end_at)
        : aStart
        ? new Date(aStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000)
        : null;
      if (!aStart || !aEnd) return false;
      return aStart < end && aEnd > start;
    });

    const isBlocked = blockedWindows.some(
      (b) => new Date(b.start_datetime) < end && new Date(b.end_datetime) > start
    );

    if (hasAppointment) return "booked";
    if (isBlocked) return "blocked";
    return "available";
  };

  const handleBlockSlot = async () => {
    if (!selectedSlot) return;

    try {
      const start = selectedSlot.start;
      const end = new Date(start.getTime() + blockDuration * 60 * 1000);

      // ensure block fits within availability window and doesn't overlap appointments/blocks
      const status = getSlotStatus(
        { ...selectedSlot, start, windowStart: selectedSlot.windowStart, windowEnd: selectedSlot.windowEnd },
        blockDuration
      );
      if (status === "unavailable") {
        setConflictError(
          `Cannot block ${blockDuration}-minute window starting at ${selectedSlot.label} because it extends past your availability.`
        );
        setTimeout(() => setConflictError(null), 5000);
        return;
      }
      if (status === "booked") {
        setConflictError(
          `Cannot block ${blockDuration}-minute window starting at ${selectedSlot.label} because it overlaps an existing appointment.`
        );
        setTimeout(() => setConflictError(null), 5000);
        return;
      }
      if (status === "blocked") {
        setConflictError(
          `Cannot block ${blockDuration}-minute window starting at ${selectedSlot.label} because it overlaps another blocked time.`
        );
        setTimeout(() => setConflictError(null), 5000);
        return;
      }

      await createUnavailability({
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
      });
      await loadBlocks();
      setShowBlockDialog(false);
      setSelectedSlot(null);
      setConflictError(null);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setConflictError(
        err instanceof Error
          ? err.message
          : "Failed to block time via backend."
      );
      setTimeout(() => setConflictError(null), 5000);
    }
  };

  const handleUnblockSlot = async (time) => {
    const targetSlot = daySlots.find((s) => s.label === time);
    if (!targetSlot) return;
    const { start, end } = targetSlot;
    const target = blockedWindows.find(
      (b) => new Date(b.start_datetime) < end && new Date(b.end_datetime) > start
    );
    if (!target) return;
    try {
      await deleteUnavailability(target.id);
      await loadBlocks();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setConflictError(
        err instanceof Error
          ? err.message
          : "Failed to unblock time via backend."
      );
      setTimeout(() => setConflictError(null), 5000);
    }
  };

  const handleNotifyRunningLate = async (appointmentId) => {
    if (!appointmentId) return;
    if (notifiedAppointments.has(appointmentId)) return; // Already notified, don't allow spam
    setNotifyingLate(appointmentId);
    setConflictError(null);
    try {
      await notifyRunningLate(appointmentId);
      // Mark as notified on success
      setNotifiedAppointments(prev => new Set(prev).add(appointmentId));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setConflictError(
        err instanceof Error
          ? err.message
          : "Failed to notify customer."
      );
      setTimeout(() => setConflictError(null), 5000);
    } finally {
      setNotifyingLate(null);
    }
  };

  const handleEditAppointment = (appointment) => {
    setConflictError(null);
    setEditingAppointment(appointment);
    setEditFormData({
      time: appointment.displayTime ?? "9:00 AM",
      notes: appointment.notes ?? "",
      status: appointment.status ?? "scheduled",
      cancel_reason: appointment.cancellation_reason ?? "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment) return;

    if (editFormData.status === "cancelled" && !editFormData.cancel_reason) {
      setConflictError("Please provide a cancellation reason.");
      return;
    }

    const isPast = isPastAppointment(editingAppointment);
    const isInProg = isInProgressAppointment(editingAppointment);
    
    // Only check for time conflicts if it's NOT a past appointment
    // Past appointments can't be rescheduled, only status can be changed
    if (!isPast) {
      const conflictingTime = editFormData.time;
      const range = slotToRange(selectedDate, conflictingTime);
      const hasConflict = todayAppointments.some((a) => {
        if (a.id === editingAppointment?.id) return false;
        const start = a.start_at
          ? new Date(a.start_at)
          : new Date(`${a.appointment_date}T${a.start_time}`);
        const end =
          a.end_at || a.end_time
            ? new Date(a.end_at || `${a.appointment_date}T${a.end_time}`)
            : new Date(start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
        return start < range.end && end > range.start;
      });
      const isBlocked = blockedWindows.some(
        (b) =>
          new Date(b.start_datetime) < range.end &&
          new Date(b.end_datetime) > range.start
      );

      if (hasConflict) {
        setConflictError(
          `Cannot schedule at ${conflictingTime} - Time slot is already booked`
        );
        setTimeout(() => setConflictError(null), 5000);
        return;
      }

      if (isBlocked) {
        setConflictError(
          `Cannot schedule at ${conflictingTime} - Time slot is blocked`
        );
        setTimeout(() => setConflictError(null), 5000);
        return;
      }
    }

    // enforce allowed statuses by context
    const allowed = isInProg
      ? ["scheduled", "cancelled", "completed", "no_show"]
      : isPast
      ? ["completed", "no_show"]
      : ["scheduled", "cancelled"];
    if (!allowed.includes(editFormData.status)) {
      setConflictError("Invalid status for this appointment state.");
      return;
    }

    try {
      setSavingEdit(true);
      const appointmentId = editingAppointment.id;
      
      if (!isPast && !isInProg) {
        // Use dedicated cancel endpoint for upcoming appointments
        await cancelAppointment(appointmentId, editFormData.cancel_reason || undefined);
        // Update notes separately if provided (cancel endpoint doesn't handle notes)
        if (editFormData.notes) {
          await patchAppointment(appointmentId, {
            notes: editFormData.notes,
          });
        }
      } else if (isCanceled(editingAppointment)) {
        // Past canceled: no status/time changes allowed, only notes can be updated
        if (editFormData.notes) {
          await patchAppointment(appointmentId, {
            notes: editFormData.notes,
          });
        }
      } else {
        // For completed/no_show, use the complete endpoint
        if (editFormData.status === "completed" || editFormData.status === "no_show") {
          // Use the mark_completed endpoint for these statuses
          const { markAppointmentComplete } = await import("../../salon-reg/api.js");
          await markAppointmentComplete(appointmentId, editFormData.status);
        } else if (editFormData.status === "cancelled") {
          // Use dedicated cancel endpoint for cancellation
          await cancelAppointment(appointmentId, editFormData.cancel_reason || undefined);
          // Update notes separately if provided
          if (editFormData.notes) {
            await patchAppointment(appointmentId, {
              notes: editFormData.notes,
            });
          }
        } else {
          // For other status changes, use the generic update endpoint
          await patchAppointment(appointmentId, {
            status: editFormData.status,
            notes: editFormData.notes || undefined,
          });
        }
      }
      setConflictError(null);
      setShowEditModal(false);
      setEditingAppointment(null);
      await loadAppointments();
      await loadBlocks();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setConflictError(
        err instanceof Error
          ? err.message
          : "Failed to update appointment via backend PATCH /api/appointments."
      );
      setTimeout(() => setConflictError(null), 5000);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingAppointment(null);
    setConflictError(null);
  };

  return (
    <div className="space-y-6">
      {savedSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <p className="text-green-600">Schedule updated successfully!</p>
        </div>
      )}

      <div className="mb-6">
        <nav className="flex p-1 bg-gray-200 rounded-full w-full">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-2 font-medium text-sm rounded-full ${
              activeTab === "schedule"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-700 hover:text-gray-900"
            }`}
          >
            My Schedule
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 py-2 font-medium text-sm rounded-full ${
              activeTab === "notifications"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-700 hover:text-gray-900"
            }`}
          >
            Notifications
          </button>
        </nav>
      </div>

      {activeTab === "schedule" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <CalendarIcon className="w-5 h-5 text-gray-600" />
                  <p className="text-sm text-gray-600">
                    Appointments on{" "}
                    {selectedDate.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {
                    todayAppointments.filter((a) =>
                      ["scheduled", "confirmed", "completed", "no_show"].includes(
                        (a.status || "").toLowerCase()
                      )
                    ).length
                  }
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <p className="text-sm text-gray-600">
                    Hours Booked on{" "}
                    {selectedDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {(() => {
                    const totalMinutes = todayAppointments
                      .filter((a) =>
                        ["scheduled", "confirmed", "completed", "no_show"].includes(
                          (a.status || "").toLowerCase()
                        )
                      )
                      .reduce((sum, a) => {
                        if (a.duration_minutes) return sum + Number(a.duration_minutes) || 0;
                        if (a.start_at && a.end_at) {
                          return (
                            sum +
                            Math.max(
                              0,
                              (new Date(a.end_at).getTime() - new Date(a.start_at).getTime()) /
                                (60 * 1000)
                            )
                          );
                        }
                        return sum;
                      }, 0);
                    return `${(totalMinutes / 60).toFixed(1)}h`;
                  })()}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <UserIcon className="w-5 h-5 text-gray-600" />
                  <p className="text-sm text-gray-600">
                    Expected Revenue on{" "}
                    {selectedDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  $
                  {todayAppointments
                    .filter((a) => ["scheduled", "completed", "no_show"].includes((a.status || "").toLowerCase()))
                    .reduce((sum, a) => sum + (a.price ?? 0), 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Daily Schedule</h2>
              <p className="text-gray-600">View and manage your appointments</p>
              <p className="text-xs text-gray-500">
                Showing slots based on your weekly availability. To block a custom duration, choose a start time below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={handlePrevMonth}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {currentMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <button
                    onClick={handleNextMonth}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-0 mb-1">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-gray-600 py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7" style={{ gap: "2px" }}>
                  {getCalendarDates().map((day, idx) => {
                    const isSelected =
                      day.isCurrentMonth &&
                      selectedDate.getDate() === day.date &&
                      selectedDate.getMonth() === currentMonth.getMonth() &&
                      selectedDate.getFullYear() === currentMonth.getFullYear();
                    const now = new Date();
                    const isToday =
                      day.isCurrentMonth &&
                      now.getDate() === day.date &&
                      now.getMonth() === currentMonth.getMonth() &&
                      now.getFullYear() === currentMonth.getFullYear();

                    return (
                      <button
                        key={idx}
                        onClick={() =>
                          day.isCurrentMonth && handleDateClick(day.date)
                        }
                        style={{ width: "100%", height: "32px" }}
                        className={`flex items-center justify-center text-xs rounded bg-gray-100 border border-gray-300 ${
                          isSelected
                            ? "bg-gray-900 text-white font-semibold"
                            : day.isCurrentMonth
                            ? "hover:bg-gray-200 text-gray-600"
                            : "text-gray-300 cursor-not-allowed"
                        } ${
                          isToday && !isSelected ? "border-blue-500 border-2" : ""
                        }`}
                        disabled={!day.isCurrentMonth}
                      >
                        {day.date}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedDate.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  <button
                    onClick={() => setShowBlockDialog(true)}
                    className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-200 text-sm font-medium"
                  >
                    Block Time
                  </button>
                </div>

                  <div className="flex items-center gap-3 mb-2">
                    <label className="text-sm text-gray-700">Block duration:</label>
                    <select
                      value={blockDuration}
                      onChange={(e) => setBlockDuration(Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {[15, 30, 45, 60].map((n) => (
                        <option key={n} value={n}>
                          {n} minutes
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    className="max-h-96 overflow-y-auto flex flex-col"
                    style={{ gap: "20px" }}
                  >
                  {loadingAvailability ? (
                    <div className="text-sm text-gray-500">Loading availability…</div>
                  ) : daySlots.length === 0 ? (
                    <div className="text-sm text-gray-600">No availability for this day.</div>
                  ) : (
                    daySlots.map((slot) => {
                      const status = getSlotStatus(slot, slot.duration || DISPLAY_SLOT_MINUTES);
                      const appointment = todayAppointments.find(
                        (a) => a.displayTime === slot.label
                      );
                      const fullName =
                        appointment?.customer?.name || appointment?.customer_name || "Customer";
                      const nameParts = fullName.trim().split(" ");
                      const shortName =
                        nameParts.length > 1
                          ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
                          : fullName;

                      const blockHit = blockedWindows.find(
                        (b) =>
                          new Date(b.start_datetime) <= slot.start &&
                          new Date(b.end_datetime) > slot.start
                      );
                      const isBlockStart =
                        blockHit &&
                        new Date(blockHit.start_datetime).getTime() === slot.start.getTime();

                      return (
                        <div
                          key={`${slot.label}-${slot.start.getTime()}`}
                          style={{
                            paddingTop: "12px",
                            paddingBottom: "12px",
                            paddingLeft: "20px",
                            paddingRight: "20px",
                          }}
                          className={`rounded-lg border border-gray-200 ${
                            status === "booked"
                              ? "bg-blue-50 border-blue-200"
                              : status === "blocked"
                              ? "bg-gray-100 border-gray-300"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-700">
                                {slot.label}
                              </span>
                            </div>

                            {status === "booked" && appointment && (
                              <div className="flex items-center gap-3 text-sm text-gray-700">
                                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                  Booked
                                </span>
                                  <div className="flex flex-col leading-tight">
                                    <span className="font-semibold text-gray-800">{shortName}</span>
                                  </div>
                              </div>
                            )}

                            {status === "blocked" && blockHit && (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-700 font-medium">
                                  {isBlockStart
                                    ? `Blocked until ${formatClock(new Date(blockHit.end_datetime))}`
                                    : "Blocked"}
                                </span>
                                {isBlockStart && (
                                  <button
                                    onClick={() => handleUnblockSlot(slot.label)}
                                    className="px-3 py-1.5 bg-gray-200 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                                  >
                                    Unblock
                                  </button>
                                )}
                              </div>
                            )}

                            {status === "available" && (
                              <span className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 rounded text-xs font-medium select-none">
                                Available
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="mb-2">
              <h2 className="text-xl font-bold text-gray-900 mb-1">All Appointments</h2>
              <p className="text-sm text-gray-600">View and manage all your appointments</p>
            </div>

            {loadingAppointments ? (
              <div className="text-sm text-gray-500">Loading appointments…</div>
            ) : (
              <>
                {renderSection("Upcoming", sortByStart(upcomingAppointments), "upcoming")}
                {renderSection("In Progress", sortByStart(inProgressAppointments), "inprogress")}
                {renderSection("Past", sortByStart(pastAppointments), "past")}
                {renderSection("Cancelled", sortByStart(cancelledAppointments), "cancelled")}
                {upcomingAppointments.length === 0 &&
                  inProgressAppointments.length === 0 &&
                  pastAppointments.length === 0 &&
                  cancelledAppointments.length === 0 && (
                    <div className="text-center py-12">
                      <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No appointments for this date</p>
                    </div>
                  )}
              </>
            )}
          </div>
        </>
      )}

      {activeTab === "notifications" && (
        <NotificationsPage />
      )}

      {showBlockDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Block Time Slot</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a time slot to mark as unavailable
            </p>
            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-1">
              {blockSlots
                .filter((slot) => getSlotStatus(slot, blockDuration) === "available")
                .map((slot) => (
                  <button
                    key={`${slot.label}-${slot.start.toISOString()}`}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full px-4 py-2 rounded-md ${
                      selectedSlot?.start?.getTime() === slot.start.getTime()
                        ? "bg-gray-900 text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              {blockSlots.filter((slot) => getSlotStatus(slot, blockDuration) === "available").length === 0 && (
                <div className="text-sm text-gray-500">No available slots to block for this day.</div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBlockDialog(false);
                  setSelectedSlot(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockSlot}
                disabled={!selectedSlot}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Block Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-1">Edit Appointment</h3>
              <p className="text-sm text-gray-600">Update appointment details</p>
            </div>
            {conflictError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-2">
                {conflictError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="text"
                  value={editFormData.time}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isCanceled(editingAppointment) && !isPastAppointment(editingAppointment)}
                >
                  {isPastAppointment(editingAppointment) ? (
                    isCanceled(editingAppointment) ? (
                      <option value="cancelled">Cancelled</option>
                    ) : isInProgressAppointment(editingAppointment) ? (
                      <>
                        <option value="scheduled">Scheduled</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                        <option value="no_show">No Show</option>
                      </>
                    ) : (
                      <>
                        <option value="completed">Completed</option>
                        <option value="no_show">No Show</option>
                      </>
                    )
                  ) : isInProgressAppointment(editingAppointment) ? (
                    <>
                      <option value="scheduled">Scheduled</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                      <option value="no_show">No Show</option>
                    </>
                  ) : (
                    <>
                      <option value="scheduled">Scheduled</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  )}
                </select>
              </div>

              {editFormData.status === "cancelled" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation Reason
                  </label>
                  <textarea
                    value={editFormData.cancel_reason}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, cancel_reason: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Why is this appointment being canceled?"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add any notes about this appointment..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseEditModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
