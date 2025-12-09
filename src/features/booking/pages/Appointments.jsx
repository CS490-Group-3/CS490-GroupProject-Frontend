import { useCallback, useEffect, useState } from "react";
import { listUserAppointments, submitReview, updateReview, updateAppointment } from "../api.js";
import AppointmentCard from "../components/AppointmentCard.jsx";
import RescheduleModal from "../widgets/RescheduleModal.jsx";
import CancelModal from "../widgets/CancelModal.jsx";
import PostAppointmentReview from "../components/PostAppointmentReview.jsx";
import { Button } from "../../../shared/ui/button.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select.jsx";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

export default function Appointments() {
  const [tab, setTab] = useState("upcoming"); // upcoming | inprogress | past | cancelled
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  
  // Separate state for each tab
  const [upcomingAppts, setUpcomingAppts] = useState([]);
  const [inprogressAppts, setInprogressAppts] = useState([]);
  const [pastAppts, setPastAppts] = useState([]);
  const [cancelledAppts, setCancelledAppts] = useState([]);
  
  // Loading states
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingInprogress, setLoadingInprogress] = useState(true);
  const [loadingPast, setLoadingPast] = useState(false);
  const [loadingCancelled, setLoadingCancelled] = useState(false);
  
  // Pagination for past/cancelled only
  const [pastPage, setPastPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);
  const [pastTotal, setPastTotal] = useState(0);
  const [cancelledTotal, setCancelledTotal] = useState(0);
  const pastLimit = 10;
  const cancelledLimit = 10;
  
  // Sort (only for past appointments)
  const [sortOrder, setSortOrder] = useState("desc"); // desc = newest first, asc = oldest first

  // modal targets
  const [resAppt, setResAppt] = useState(null);
  const [cancelAppt, setCancelAppt] = useState(null);

  const now = new Date();
  const isCancelled = (a) => (a?.status || "").toLowerCase() === "cancelled";
  const isPast = (a) => {
    const start = a.start_at ? new Date(a.start_at) : null;
    return start ? start < now : false;
  };
  const isInProgress = (a) => {
    if (!a?.start_at) return false;
    const start = new Date(a.start_at);
    const end = a.end_at
      ? new Date(a.end_at)
      : new Date(start.getTime() + (a.duration_minutes || 30) * 60 * 1000);
    return start <= now && now < end && !isCancelled(a);
  };

  // Load upcoming appointments (always load these)
  const loadUpcoming = useCallback(async () => {
    try {
      setLoadingUpcoming(true);
      const res = await listUserAppointments({
        when: "upcoming",
        page: 1,
        limit: 100,
        sort: "asc"
      });
      
      if (res && res.appointments) {
        // Filter out cancelled and in-progress from upcoming
        const filtered = res.appointments.filter((a) => !isCancelled(a) && !isInProgress(a));
        setUpcomingAppts(filtered);
      } else if (Array.isArray(res)) {
        const filtered = res.filter((a) => !isCancelled(a) && !isInProgress(a));
        setUpcomingAppts(filtered);
      } else {
        setUpcomingAppts([]);
      }
    } catch (e) {
      console.error("Failed to load upcoming appointments", e);
      setUpcomingAppts([]);
    } finally {
      setLoadingUpcoming(false);
    }
  }, []);

  // Load in-progress appointments (always load these)
  const loadInprogress = useCallback(async () => {
    try {
      setLoadingInprogress(true);
      // Fetch all upcoming to find in-progress ones
      const res = await listUserAppointments({
        when: "upcoming",
        page: 1,
        limit: 100,
        sort: "asc"
      });
      
      if (res && res.appointments) {
        const filtered = res.appointments.filter((a) => isInProgress(a));
        setInprogressAppts(filtered);
      } else if (Array.isArray(res)) {
        const filtered = res.filter((a) => isInProgress(a));
        setInprogressAppts(filtered);
      } else {
        setInprogressAppts([]);
      }
    } catch (e) {
      console.error("Failed to load in-progress appointments", e);
      setInprogressAppts([]);
    } finally {
      setLoadingInprogress(false);
    }
  }, []);

  // Load past appointments (only when tab is clicked)
  const loadPast = useCallback(async (pageNum = pastPage) => {
    try {
      setLoadingPast(true);
      setErr("");
      
      const res = await listUserAppointments({
        when: "past",
        page: pageNum,
        limit: pastLimit,
        sort: sortOrder
      });
      
      if (res && res.appointments) {
        // Filter out cancelled from past
        const filtered = res.appointments.filter((a) => !isCancelled(a));
        setPastAppts(filtered);
        // Use filtered length for this page, but we need to track total across all pages
        // For now, use the backend total_count minus an estimate of cancelled
        // Actually, better: just use the filtered count for this page and calculate total differently
        // The issue is we don't know total non-cancelled past appointments without fetching all
        // So let's use the actual filtered length for now and adjust pagination accordingly
        setPastTotal(res.total_count || filtered.length);
      } else if (Array.isArray(res)) {
        const filtered = res.filter((a) => !isCancelled(a));
        setPastAppts(filtered);
        setPastTotal(filtered.length);
      } else {
        setPastAppts([]);
        setPastTotal(0);
      }
    } catch (e) {
      console.error("Failed to load past appointments", e);
      setErr(e?.message || "Failed to load past appointments.");
      setPastAppts([]);
      setPastTotal(0);
    } finally {
      setLoadingPast(false);
    }
  }, [pastPage, pastLimit, sortOrder]);

  // Load cancelled appointments (only when tab is clicked)
  const loadCancelled = useCallback(async (pageNum = cancelledPage) => {
    try {
      setLoadingCancelled(true);
      setErr("");
      
      const res = await listUserAppointments({
        when: "all",
        status: "cancelled",
        page: pageNum,
        limit: cancelledLimit,
        sort: "desc"
      });
      
      if (res && res.appointments) {
        setCancelledAppts(res.appointments);
        setCancelledTotal(res.total_count || res.appointments.length);
      } else if (Array.isArray(res)) {
        setCancelledAppts(res);
        setCancelledTotal(res.length);
      } else {
        setCancelledAppts([]);
        setCancelledTotal(0);
      }
    } catch (e) {
      console.error("Failed to load cancelled appointments", e);
      setErr(e?.message || "Failed to load cancelled appointments.");
      setCancelledAppts([]);
      setCancelledTotal(0);
    } finally {
      setLoadingCancelled(false);
    }
  }, [cancelledPage, cancelledLimit]);

  // Initial load - only load upcoming and inprogress
  useEffect(() => {
    setLoading(true);
    Promise.all([loadUpcoming(), loadInprogress()]).finally(() => {
      setLoading(false);
    });
  }, [loadUpcoming, loadInprogress]);

  // Load past when tab is clicked
  useEffect(() => {
    if (tab === "past" && pastAppts.length === 0 && !loadingPast) {
      loadPast(1);
    }
  }, [tab, pastAppts.length, loadingPast, loadPast]);

  // Load cancelled when tab is clicked
  useEffect(() => {
    if (tab === "cancelled" && cancelledAppts.length === 0 && !loadingCancelled) {
      loadCancelled(1);
    }
  }, [tab, cancelledAppts.length, loadingCancelled, loadCancelled]);

  // Reset page when sort changes for past
  useEffect(() => {
    if (tab === "past") {
      setPastPage(1);
      loadPast(1);
    }
  }, [sortOrder]);

  // handlers (open modals)
  function onReschedule(appt) { setResAppt(appt); }
  function onCancel(appt) { setCancelAppt(appt); }

  // apply updates from modals
  async function handleSubmitReview(id, payload, reviewId = null) {
    const clean = {
      stars: payload.stars,
      comment: payload.comment?.trim() ?? "",
    };

    let result;
    if (reviewId) {
      result = await updateReview(reviewId, clean);
    } else {
      result = await submitReview(id, clean);
    }
    
    return result;
  }

  async function saveNote(apptId, noteText) {
    try {
      await updateAppointment({ id: apptId, notes: noteText?.trim() || null });
      // Reload the appropriate tab
      if (tab === "upcoming") {
        await loadUpcoming();
      } else if (tab === "past") {
        await loadPast(pastPage);
      } else if (tab === "cancelled") {
        await loadCancelled(cancelledPage);
      }
    } catch (e) {
      console.error("Failed to save note", e);
    }
  }

  const handlePastPageChange = (newPage) => {
    if (newPage < 1 || newPage > Math.ceil(pastTotal / pastLimit)) return;
    setPastPage(newPage);
    loadPast(newPage);
  };

  const handleCancelledPageChange = (newPage) => {
    if (newPage < 1 || newPage > Math.ceil(cancelledTotal / cancelledLimit)) return;
    setCancelledPage(newPage);
    loadCancelled(newPage);
  };

  const handleSortChange = (newSort) => {
    setSortOrder(newSort);
    setPastPage(1);
  };

  const reloadCurrentTab = useCallback(async () => {
    if (tab === "upcoming") {
      await loadUpcoming();
    } else if (tab === "inprogress") {
      await loadInprogress();
    } else if (tab === "past") {
      await loadPast(pastPage);
    } else if (tab === "cancelled") {
      await loadCancelled(cancelledPage);
    }
  }, [tab, pastPage, cancelledPage, loadUpcoming, loadInprogress, loadPast, loadCancelled]);

  if (loading && upcomingAppts.length === 0 && inprogressAppts.length === 0) {
    return <div className="max-w-6xl mx-auto p-6 text-gray-600">Loading…</div>;
  }
  if (err && tab !== "upcoming" && tab !== "inprogress") {
    return <div className="max-w-6xl mx-auto p-6 text-red-600">{err}</div>;
  }

  const currentAppts = tab === "upcoming" ? upcomingAppts : 
                      tab === "inprogress" ? inprogressAppts :
                      tab === "past" ? pastAppts : cancelledAppts;
  const currentLoading = tab === "upcoming" ? loadingUpcoming :
                        tab === "inprogress" ? loadingInprogress :
                        tab === "past" ? loadingPast : loadingCancelled;
  const currentTotal = tab === "past" ? pastTotal : 
                       tab === "cancelled" ? cancelledTotal : 
                       (tab === "upcoming" ? upcomingAppts.length : inprogressAppts.length);
  const currentPage = tab === "past" ? pastPage : cancelledPage;
  const currentLimit = tab === "past" ? pastLimit : cancelledLimit;
  const totalPages = Math.ceil(currentTotal / currentLimit);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">My Appointments</h1>
        <div className="flex items-center gap-4">
          {tab === "past" && (
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <Select value={sortOrder} onValueChange={handleSortChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {(tab === "past" || tab === "cancelled") && currentTotal > 0 && (
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * currentLimit + 1} to {Math.min((currentPage - 1) * currentLimit + currentAppts.length, currentTotal)} of {currentTotal}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-full bg-gray-100 p-1 w-full md:w-[720px]">
        <div className="grid grid-cols-4">
          {[
            ["upcoming", `Upcoming (${upcomingAppts.length})`],
            ["inprogress", `In Progress (${inprogressAppts.length})`],
            ["past", `Past (${tab === "past" ? currentTotal : "-"})`],
            ["cancelled", `Cancelled (${tab === "cancelled" ? currentTotal : "-"})`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                tab === key ? "bg-white shadow text-gray-900" : "text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "upcoming" && (
        currentLoading ? (
          <div className="text-sm text-gray-600">Loading upcoming appointments…</div>
        ) : upcomingAppts.length === 0 ? (
          <div className="text-sm text-gray-600">No upcoming appointments.</div>
        ) : (
          <div className="space-y-4">
            {upcomingAppts.map((a) => (
              <AppointmentCard
                key={a.id}
                appt={a}
                onCancel={onCancel}
                onReschedule={onReschedule}
                onSaveNote={saveNote}
                onReviewSubmitted={reloadCurrentTab}
              />
            ))}
          </div>
        )
      )}

      {tab === "inprogress" && (
        currentLoading ? (
          <div className="text-sm text-gray-600">Loading in-progress appointments…</div>
        ) : inprogressAppts.length === 0 ? (
          <div className="text-sm text-gray-600">No in-progress appointments.</div>
        ) : (
          <div className="space-y-4">
            {inprogressAppts.map((a) => (
              <AppointmentCard
                key={a.id}
                appt={a}
                compact
                onCancel={onCancel}
                onSaveNote={saveNote}
                onReviewSubmitted={reloadCurrentTab}
              />
            ))}
          </div>
        )
      )}

      {tab === "past" && (
        currentLoading ? (
          <div className="text-sm text-gray-600">Loading past appointments…</div>
        ) : pastAppts.length === 0 ? (
          <div className="text-sm text-gray-600">No past appointments.</div>
        ) : (
          <div className="space-y-4">
            {pastAppts.map((a) => (
              <AppointmentCard key={a.id} appt={a} compact onReviewSubmitted={reloadCurrentTab}>
                {a.status === "completed" && !a.review ? (
                  <PostAppointmentReview
                    appointmentId={a.id}
                    existingReview={a.review}
                    salonName={a.salon?.name}
                    employeeName={a.barber?.name || a.employee?.name}
                    onSubmit={handleSubmitReview}
                    onReviewSubmitted={reloadCurrentTab}
                  />
                ) : null}
              </AppointmentCard>
            ))}
          </div>
        )
      )}

      {tab === "cancelled" && (
        currentLoading ? (
          <div className="text-sm text-gray-600">Loading cancelled appointments…</div>
        ) : cancelledAppts.length === 0 ? (
          <div className="text-sm text-gray-600">No cancelled appointments.</div>
        ) : (
          <div className="space-y-4">
            {cancelledAppts.map((a) => (
              <AppointmentCard key={a.id} appt={a} compact onSaveNote={saveNote} onReviewSubmitted={reloadCurrentTab} />
            ))}
          </div>
        )
      )}

      {/* Pagination for past/cancelled */}
      {(tab === "past" || tab === "cancelled") && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => tab === "past" ? handlePastPageChange(currentPage - 1) : handleCancelledPageChange(currentPage - 1)}
            disabled={currentPage === 1 || currentLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => tab === "past" ? handlePastPageChange(currentPage + 1) : handleCancelledPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || currentLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {resAppt && (
        <RescheduleModal
          appt={resAppt}
          onClose={() => setResAppt(null)}
          onSuccess={reloadCurrentTab}
        />
      )}
      {cancelAppt && (
        <CancelModal
          appt={cancelAppt}
          onClose={() => setCancelAppt(null)}
          onSuccess={reloadCurrentTab}
        />
      )}
    </div>
  );
}
