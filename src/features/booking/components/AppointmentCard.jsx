import { Link } from "react-router-dom";
import { useState } from "react";

export default function AppointmentCard({
  appt,
  onCancel,
  onReschedule,
  compact = false,
  onSaveNote,
  children,
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

      {/* REVIEW DISPLAY */}
      {appt.review && (
        <div className="mt-5 rounded-xl border bg-gray-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Your Review</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-sm ${
                    star <= (appt.review.stars || appt.review.rating || 0)
                      ? "text-amber-500"
                      : "text-gray-300"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          {appt.review.text || appt.review.comment ? (
            <p className="text-sm text-gray-700">{appt.review.text || appt.review.comment}</p>
          ) : null}
          
          {/* Review Images */}
          {appt.review.images && appt.review.images.length > 0 && (
            <div className="flex flex-col md:flex-row gap-4">
              {(() => {
                const beforeImages = appt.review.images.filter(
                  (img) => img.label === "before" || img.type === "before"
                );
                const afterImages = appt.review.images.filter(
                  (img) => img.label === "after" || img.type === "after"
                );
                return (
                  <>
                    {beforeImages.length > 0 && (
                      <div className="flex-1">
                        <h4 className="text-xs font-medium text-gray-600 mb-2">Before</h4>
                        <div className="flex gap-2 flex-wrap">
                          {beforeImages.map((img) => (
                            <img
                              key={img.id || img.url || img.signed_url}
                              src={img.url || img.signed_url}
                              alt="Before"
                              className="h-48 w-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
                              onClick={() => {
                                const url = img.url || img.signed_url;
                                if (url) window.open(url, "_blank");
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {afterImages.length > 0 && (
                      <div className="flex-1">
                        <h4 className="text-xs font-medium text-gray-600 mb-2">After</h4>
                        <div className="flex gap-2 flex-wrap">
                          {afterImages.map((img) => (
                            <img
                              key={img.id || img.url || img.signed_url}
                              src={img.url || img.signed_url}
                              alt="After"
                              className="h-48 w-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
                              onClick={() => {
                                const url = img.url || img.signed_url;
                                if (url) window.open(url, "_blank");
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          
          {/* Owner Response */}
          {appt.review.response && (
            <div className="mt-3 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
              <div className="text-sm font-medium text-indigo-900 mb-1">Salon Owner Response:</div>
              <div className="text-sm text-indigo-800">
                {appt.review.response.response_text || appt.review.response.text}
              </div>
            </div>
          )}
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
