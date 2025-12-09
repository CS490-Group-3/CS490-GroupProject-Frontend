import { Link } from "react-router-dom";
import { useState } from "react";
import PostAppointmentReview from "./PostAppointmentReview.jsx";

export default function AppointmentCard({
  appt,
  onCancel,
  onReschedule,
  compact = false,
  onSaveNote,
  children,
  onReviewSubmitted,
}) {
  const start = new Date(appt.start_at || appt.whenISO);
  const salon = appt.salon || {};
  const service = appt.service || {};
  const barber = appt.barber || appt.employee || {};
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(appt.notes || "");
  const hasNote = Boolean(appt.notes);

  const showNoteEditor =
    onSaveNote && appt.status !== "cancelled" && (!hasNote || editingNote);

  const saveNote = async () => {
    if (!onSaveNote) return;
    await onSaveNote(appt.id, noteDraft);
    setEditingNote(false);
  };
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        {/* LEFT: title + meta */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold">{salon.name || "Salon"}</div>
            <StatusBadge status={appt.status} />
            {appt.barber_running_late && (
              <span className="text-xs border rounded-full px-2 py-0.5 bg-amber-50 text-amber-800 border-amber-200">
                Barber Running Late
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-[20px_1fr] gap-x-2 text-sm text-gray-700">
            <span>📅</span>
            <span>
              {start.toLocaleDateString(undefined, {
                month: "numeric",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>⏰</span>
            <span>
              {start.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span>📍</span>
            <span className="truncate">{salon.address || "—"}</span>
          </div>
        </div>

        {/* RIGHT: details column */}
        <div className="w-64 text-sm">
          <Row label="Service:" value={service.name || "—"} />
          <Row label="Barber:" value={barber.name || "—"} />
          <Row
            label="Price:"
            value={
              service.price != null ? `$${Number(service.price).toFixed(2)}` : "See salon"
            }
          />
          <Row label="Status:" value={appt.status} />
          {appt.payment_status && (
            <Row 
              label="Payment:" 
              value={
                <span className={`font-medium ${
                  appt.payment_status === "completed" ? "text-green-600" : 
                  appt.payment_status === "pending" ? "text-yellow-600" : 
                  appt.payment_status === "failed" ? "text-red-600" : 
                  "text-gray-600"
                }`}>
                  {appt.payment_status === "completed" ? "✓ Paid" : 
                   appt.payment_status === "pending" ? "Pending" : 
                   appt.payment_status === "failed" ? "Failed" : 
                   appt.payment_status}
                </span>
              } 
            />
          )}
          {appt.status === "completed" && appt.payment_status === "completed" && (
            <Row 
              label="Loyalty:" 
              value={
                appt.loyalty_points_earned > 0 ? (
                  <span className="text-indigo-600 font-medium">
                    +{appt.loyalty_points_earned} points earned
                  </span>
                ) : (
                  <span className="text-gray-500 text-xs">Points awarded on completion</span>
                )
              } 
            />
          )}
          {(appt.status === "scheduled" || appt.status === "confirmed") && appt.payment_status === "completed" && appt.loyalty_points_pending > 0 && (
            <Row 
              label="Loyalty:" 
              value={
                <span className="text-amber-600 font-medium">
                  {appt.loyalty_points_pending} points pending
                </span>
              } 
            />
          )}
        </div>
      </div>

      {/* CANCELLATION REASON */}
      {appt.status === "cancelled" && appt.cancellation_reason && (
        <div className="mt-3 w-full">
            <div className="rounded-xl border bg-red-50 text-red-700 text-sm px-3 py-2">
            Cancellation reason: {appt.cancellation_reason}
            </div>
        </div>
      )}

      {/* NOTES */}
      {appt.notes && !showNoteEditor && (
        <div className="mt-3 w-full">
          <div className="rounded-xl border bg-gray-50 text-gray-700 text-sm px-3 py-2">
            Note for barber: {appt.notes}
          </div>
        </div>
      )}
      {showNoteEditor && (
        <div className="mt-3 w-full space-y-2">
          <label className="text-sm text-gray-700">Add a note for your barber</label>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Optional note about your appointment..."
          />
          <div className="flex gap-2">
            <button
              onClick={saveNote}
              className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm"
            >
              Save Note
            </button>
            {hasNote && (
              <button
                onClick={() => {
                  setNoteDraft(appt.notes || "");
                  setEditingNote(false);
                }}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTIONS */}
      {!compact && (
        <div className="mt-4 flex items-center gap-3 justify-between flex-wrap">
          {salon.id && (
            <Link
              to={`/salon/${salon.id}`}
              className="rounded-xl border px-3 py-2 hover:bg-gray-50"
            >
              View Salon
            </Link>
          )}
          <div className="flex gap-2">
            {onReschedule && appt.status !== "cancelled" && (
              <button
                onClick={() => onReschedule(appt)}
                className="rounded-xl border px-3 py-2 hover:bg-gray-50"
              >
                Reschedule
              </button>
            )}
            {onCancel && appt.status !== "cancelled" && (
              <button
                onClick={() => onCancel(appt)}
                className="rounded-xl border px-3 py-2 text-white bg-rose-600 hover:bg-rose-700"
              >
                Cancel
              </button>
            )}
            {onSaveNote && !showNoteEditor && appt.status !== "cancelled" && (
              <button
                onClick={() => setEditingNote(true)}
                className="rounded-xl border px-3 py-2 hover:bg-gray-50 text-sm"
              >
                {hasNote ? "Edit note" : "Add note"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* REVIEW DISPLAY - Use PostAppointmentReview component which handles editing */}
      {appt.review && (
        <div className="mt-5">
          <PostAppointmentReview
            appointmentId={appt.id}
            existingReview={appt.review}
            salonName={appt.salon?.name || "Salon"}
            employeeName={appt.barber?.name || appt.employee?.name || "Barber"}
            onSubmit={async (reviewId, payload, existingReviewId) => {
              // Handle review update
              const { updateReview, uploadReviewImages } = await import("../api.js");
              try {
                const reviewIdToUse = existingReviewId || reviewId;
                await updateReview(reviewIdToUse, payload);
                
                // If there are new images, upload them
                if (payload.beforeImages && payload.beforeImages.length > 0) {
                  const beforeLabels = payload.beforeImages.map(() => "before");
                  await uploadReviewImages(reviewIdToUse, payload.beforeImages, beforeLabels);
                }
                if (payload.afterImages && payload.afterImages.length > 0) {
                  const afterLabels = payload.afterImages.map(() => "after");
                  await uploadReviewImages(reviewIdToUse, payload.afterImages, afterLabels);
                }
                
                // Reload the appointment to show updated review
                if (typeof onReviewSubmitted === 'function') {
                  onReviewSubmitted();
                }
              } catch (err) {
                console.error("Failed to update review:", err);
              }
            }}
            onReviewSubmitted={onReviewSubmitted}
          />
        </div>
      )}

      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 text-gray-700">
      <span className="text-gray-500">{label}</span>
      <span className="ml-2">{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: ["bg-yellow-50 text-yellow-800 border-yellow-200", "Pending"],
    awaiting_vendor: ["bg-amber-50 text-amber-800 border-amber-200", "Awaiting"],
    confirmed: ["bg-gray-900 text-white border-gray-900", "Confirmed"],
    completed: ["bg-gray-100 text-gray-700 border-gray-200", "Completed"],
    cancelled: ["bg-rose-50 text-rose-700 border-rose-200", "Cancelled"],
    reschedule_requested: ["bg-indigo-50 text-indigo-700 border-indigo-200", "Reschedule"],
  };
  const [cls, label] = map[status] || ["bg-gray-100 text-gray-700 border-gray-200", status];
  return (
    <span className={`text-xs border rounded-full px-2 py-0.5 ${cls}`}>{label}</span>
  );
}
