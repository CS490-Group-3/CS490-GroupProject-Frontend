import { useEffect, useMemo, useState } from "react";
import { createAppointment, listAvailability, listEmployees } from "../api.js";
import PaymentModal from "../../payments/components/PaymentModal.jsx";

export default function BookingWizardModal({ salon, onClose }) {
  const [step, setStep] = useState(1);
  const [employee, setEmployee] = useState(null);
  const [service, setService] = useState(null);
  const [dateISO, setDateISO] = useState(toISO(new Date()));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [employees, setEmployees] = useState(salon.employees ?? []);
  const services = salon.services ?? [];

  useEffect(() => {
    if (salon.employees) return;
    (async () => {
      try {
        const rows = await listEmployees(salon.id);
        setEmployees(rows);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [salon]);

  useEffect(() => {
    if (!employee || !service || !dateISO) return;
    let alive = true;
    setSelectedSlot(null);
    setSlots([]);
    setError("");
    (async () => {
      try {
        const data = await listAvailability({
          salonId: salon.id,
          employeeId: employee.id,
          serviceId: service.id,
          dateISO,
        });
        if (alive) {
          const tz = salon.timezone || "America/New_York";
          const enriched = (data || []).map((s) => ({
            ...s,
            timezone: s.timezone || tz,
          }));
          setSlots(enriched);
        }
      } catch (err) {
        if (alive) setError("Unable to load availability for that day.");
      }
    })();
    return () => { alive = false; };
  }, [salon.id, employee, service, dateISO]);

  const progress = useMemo(() => {
    if (result) return 100;
    return Math.round((step / 5) * 100);
  }, [step, result]);

  const canNext =
    (step === 1 && !!employee) ||
    (step === 2 && !!service) ||
    (step === 3 && !!selectedSlot) ||
    step === 4 ||
    step === 5;

  function next() {
    if (step < 5) setStep(step + 1);
  }

  function back() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  // Step 4 just moves to payment step - no appointment creation yet
  function handleConfirm() {
    if (!employee || !service || !selectedSlot) return;
    // Just move to payment step
    setStep(5);
  }

  // This is no longer used - payment form handles appointment creation
  // Keeping for reference but not called

  function handlePaymentSuccess(paymentResult) {
    // Payment result includes the appointment that was created
    const appointment = paymentResult.appointment || paymentResult;
    // Show confirmation
    setResult(appointment);
  }

  return (
    <>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="absolute inset-x-0 top-10 mx-auto w-[min(960px,92vw)] rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="text-lg font-semibold">Book an Appointment</div>
            <div className="text-sm text-gray-600">
              {result ? "Confirmed" : `Step ${step} of 5`}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md px-3 py-1 border hover:bg-gray-50">Close</button>
        </div>

        <div className="px-6 pt-4">
          <div className="h-2 rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-violet-600" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {result ? (
            <ConfirmationSummary appointment={result} onClose={onClose} />
          ) : (
            <>
              {step === 1 && (
                <Step1SelectEmployee
                  employees={employees}
                  value={employee}
                  onChange={setEmployee}
                />
              )}
              {step === 2 && (
                <Step2SelectService services={services} value={service} onChange={setService} />
              )}
              {step === 3 && (
                <Step3DateTime
                  dateISO={dateISO}
                  onDateISO={setDateISO}
                  slots={slots}
                  slot={selectedSlot}
                  onSelect={setSelectedSlot}
                  error={error}
                />
              )}
              {step === 4 && (
                <Step4Review
                  employee={employee}
                  service={service}
                  slot={selectedSlot}
                  note={note}
                  onNote={setNote}
                  error={error}
                />
              )}
              {step === 5 && (
                <Step5Payment
                  employee={employee}
                  service={service}
                  slot={selectedSlot}
                  note={note}
                  salon={salon}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              )}
              {!result && (
                <div
                  className={`flex items-center ${step < 4 ? "justify-between" : "justify-start"} gap-4`}
                >
                  <button
                    onClick={back}
                    disabled={step === 1}
                    className="w-40 rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Back
                  </button>
                  {step < 4 && (
                    <button
                      onClick={next}
                      disabled={!canNext}
                      className="w-48 rounded-xl bg-gray-900 text-white px-4 py-2 disabled:opacity-40"
                    >
                      {step === 3 ? "Review" : "Continue"}
                    </button>
                  )}
                  {step === 4 && (
                    <button
                      onClick={next}
                      disabled={!canNext}
                      className="w-48 rounded-xl bg-gray-900 text-white px-4 py-2 disabled:opacity-40"
                    >
                      Continue to Payment
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

function Step1SelectEmployee({ employees, value, onChange }) {
  if (!employees.length) {
    return <div className="text-sm text-gray-600">No team members listed for this salon yet.</div>;
  }
  return (
    <div className="space-y-4">
      <div className="font-medium">Select Your Barber</div>
      <div className="grid md:grid-cols-2 gap-4">
        {employees.map((e) => (
          <button
            key={e.id}
            onClick={() => onChange(e)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left hover:shadow-sm ${
              value?.id === e.id ? "ring-2 ring-violet-600 border-violet-600" : ""
            }`}
          >
            <img
              src={e.avatar || "https://placehold.co/80x80?text=Barber"}
              alt={e.name}
              className="h-14 w-14 rounded-full object-cover"
            />
            <div>
              <div className="font-medium">{e.name}</div>
              <div className="text-sm text-gray-500">
                {(e.specialties || []).slice(0, 2).join(", ") || "Stylist"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2SelectService({ services, value, onChange }) {
  if (!services.length) {
    return <div className="text-sm text-gray-600">No services have been added yet.</div>;
  }
  return (
    <div className="space-y-4">
      <div className="font-medium">Choose a Service</div>
      <div className="space-y-3">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => onChange(s)}
            className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 hover:shadow-sm ${
              value?.id === s.id ? "ring-2 ring-violet-600 border-violet-600" : ""
            }`}
          >
            <div className="flex flex-col items-start">
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-gray-500 leading-tight">
                {s.duration_minutes ? `${s.duration_minutes} min` : "Duration varies"}
              </div>
            </div>
            <div className="font-semibold text-right">
              {s.price != null ? `$${Number(s.price).toFixed(2)}` : "See salon"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3DateTime({ dateISO, onDateISO, slots, slot, onSelect, error }) {
  const tz = slot?.timezone || "America/New_York";
  return (
    <div className="space-y-6">
      <div className="font-medium">Pick Date &amp; Time</div>
      <div className="flex flex-wrap gap-6">
        <div className="rounded-xl border p-3">
          <Calendar dateISO={dateISO} onDateISO={onDateISO} />
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-600 mb-2">Available Time Slots</div>
          {error && <div className="text-sm text-rose-600 mb-2">{error}</div>}
          <div className="max-h-[400px] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {slots.map((s) => (
                <button
                  key={s.start_at}
                  onClick={() => onSelect(s)}
                  className={`rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 ${
                    slot?.start_at === s.start_at ? "ring-2 ring-violet-600 border-violet-600" : ""
                  }`}
                >
                  {s.label || formatTimeInTz(s.start_at, s.timezone || tz)}
                </button>
              ))}
              {slots.length === 0 && (
                <div className="col-span-full text-sm text-gray-500">
                  No open slots for this day. Try another date.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4Review({ employee, service, slot, note, onNote, error }) {
  const tz = slot?.timezone || "America/New_York";
  return (
    <div className="space-y-4">
      <div className="font-medium">Review Your Appointment</div>
      <div className="rounded-xl border p-4 text-sm text-gray-700 space-y-1">
        <div>• Barber: {employee?.name}</div>
        <div>• Service: {service?.name}</div>
        <div>• Date: {slot ? toReadable(slot.start_at, tz) : "--"}</div>
        <div>• Time: {slot ? formatTimeInTz(slot.start_at, tz) : "--"}</div>
        <div>• Price: {service?.price != null ? `$${Number(service.price).toFixed(2)}` : "See salon"}</div>
      </div>
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Add any special requests or context for your stylist…"
        rows={4}
        className="w-full rounded-xl border px-3 py-2 bg-gray-50"
      />
      {error && <div className="text-sm text-rose-600">{error}</div>}
      <div className="text-sm text-gray-600">
        Click "Continue to Payment" below to proceed. Your appointment will be created when you proceed with payment in the next step.
      </div>
    </div>
  );
}

function Step5Payment({ employee, service, slot, note, salon, onPaymentSuccess }) {
  const amount = service?.price || 0;
  const tz = slot?.timezone || "America/New_York";
  const [showPaymentModal, setShowPaymentModal] = useState(true);

  if (amount <= 0) {
    return (
      <div className="space-y-4 text-center">
        <div className="font-medium">Payment</div>
        <div className="text-sm text-gray-600">
          This service doesn't have a price set. Please contact the salon to complete booking.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="font-medium">Complete Payment</div>
        <div className="rounded-xl border p-4 text-sm text-gray-700 space-y-1">
          <div>• Barber: {employee?.name}</div>
          <div>• Service: {service?.name}</div>
          <div>• Date: {slot ? toReadable(slot.start_at, tz) : "--"}</div>
          <div>• Time: {slot ? formatTimeInTz(slot.start_at, tz) : "--"}</div>
          <div>• Amount: ${Number(amount).toFixed(2)}</div>
        </div>
        <div className="text-sm text-gray-600">
          Complete payment below to confirm your appointment. Your appointment will only be created after payment succeeds.
        </div>
      </div>
      
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={(open) => {
          setShowPaymentModal(open);
          // If user closes without paying, they can retry
        }}
        appointmentData={{
          barber_id: employee?.id,
          service_id: service?.id,
          salon_id: salon?.id,
          start_at: slot?.start_at,
          end_at: slot?.end_at,
          notes: note || undefined
        }}
        amount={amount}
        salonId={salon?.id}
        onSuccess={onPaymentSuccess}
      />
    </>
  );
}

function ConfirmationSummary({ appointment, onClose }) {
  const tz = appointment?.timezone || "America/New_York";
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto size-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
        ✓
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Appointment Confirmed</h2>
      <p className="text-sm text-gray-600">
        We've scheduled your service for {toReadable(appointment.start_at, tz)} at{" "}
        {formatTimeInTz(appointment.start_at, tz)}.
      </p>
      <div className="text-sm text-green-600 font-medium">
        Payment completed successfully
      </div>
      <button
        onClick={onClose}
        className="w-full rounded-xl bg-gray-900 text-white py-3 font-medium hover:opacity-90"
      >
        Close
      </button>
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

function toISO(d) {
  const copy = new Date(d);
  const y = copy.getFullYear();
  const m = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(dateISO) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y || 0, (m || 1) - 1, d || 1);
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

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

function toReadable(iso, tz = "America/New_York") {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch (e) {
    return "";
  }
}
