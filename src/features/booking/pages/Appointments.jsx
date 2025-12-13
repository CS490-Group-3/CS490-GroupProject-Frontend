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
  const [tab, setTab] = useState("upcoming");
  const [err, setErr] = useState("");
  
  // Appointment counts (loaded on initial mount)
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [inprogressCount, setInprogressCount] = useState(0);
  const [pastCount, setPastCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [countsLoading, setCountsLoading] = useState(true);
  
  // Appointment lists (loaded when tab is clicked)
  const [upcomingAppts, setUpcomingAppts] = useState([]);
  const [inprogressAppts, setInprogressAppts] = useState([]);
  const [pastAppts, setPastAppts] = useState([]);
  const [cancelledAppts, setCancelledAppts] = useState([]);
  
  // Loading states
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [loadingInprogress, setLoadingInprogress] = useState(false);
  const [loadingPast, setLoadingPast] = useState(false);
  const [loadingCancelled, setLoadingCancelled] = useState(false);
  
  // Pagination/load more
  const [pastPage, setPastPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);
  const pastLimit = 20;
  const cancelledLimit = 20;
  const [hasMorePast, setHasMorePast] = useState(false);
  const [hasMoreCancelled, setHasMoreCancelled] = useState(false);
  
  // Sort (only for past appointments)
  const [sortOrder, setSortOrder] = useState("desc");

  // Modal targets
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

  // Load counts for all categories on initial mount
  const loadCounts = useCallback(async () => {
    try {
      setCountsLoading(true);
      
      // Fetch all categories with limit=1 to get total_count efficiently
      const [upcomingRes, pastRes, cancelledRes, allRes] = await Promise.all([
        listUserAppointments({ when: "upcoming", page: 1, limit: 1, sort: "asc" }),
        listUserAppointments({ when: "past", page: 1, limit: 1, sort: "desc" }),
        listUserAppointments({ when: "all", status: "cancelled", page: 1, limit: 1, sort: "desc" }),
        listUserAppointments({ when: "upcoming", page: 1, limit: 100, sort: "asc" }), // Need full list to filter in-progress
      ]);

      // Set counts
      setUpcomingCount(upcomingRes?.total_count || 0);
      setPastCount(pastRes?.total_count || 0);
      setCancelledCount(cancelledRes?.total_count || 0);

      // Calculate in-progress from the full upcoming list
      if (allRes?.appointments) {
        const inProgressList = allRes.appointments.filter((a) => isInProgress(a));
        setInprogressCount(inProgressList.length);
      } else if (Array.isArray(allRes)) {
        const inProgressList = allRes.filter((a) => isInProgress(a));
        setInprogressCount(inProgressList.length);
      }

      // Also load upcoming appointments immediately (they're usually small)
      if (allRes?.appointments) {
        const filtered = allRes.appointments.filter((a) => !isCancelled(a) && !isInProgress(a));
        setUpcomingAppts(filtered);
        setUpcomingCount(filtered.length);
      } else if (Array.isArray(allRes)) {
        const filtered = allRes.filter((a) => !isCancelled(a) && !isInProgress(a));
        setUpcomingAppts(filtered);
        setUpcomingCount(filtered.length);
      }
    } catch (e) {
      console.error("Failed to load appointment counts", e);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  // Load in-progress appointments
  const loadInprogress = useCallback(async () => {
    try {
      setLoadingInprogress(true);
      setErr("");
      console.log("Loading in-progress appointments...");
      const res = await listUserAppointments({
        when: "upcoming",
        page: 1,
        limit: 100,
        sort: "asc"
      });
      
      console.log("In-progress API response:", res);
      
      let appointments = [];
      if (res?.appointments && Array.isArray(res.appointments)) {
        appointments = res.appointments;
      } else if (Array.isArray(res)) {
        appointments = res;
      }
      
      const filtered = appointments.filter((a) => isInProgress(a));
      console.log(`Filtered ${filtered.length} in-progress from ${appointments.length} upcoming`);
      setInprogressAppts(filtered);
    } catch (e) {
      console.error("Failed to load in-progress appointments", e);
      setErr(e?.message || "Failed to load in-progress appointments.");
      setInprogressAppts([]);
    } finally {
      setLoadingInprogress(false);
    }
  }, []);

  // Load past appointments
  const loadPast = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoadingPast(true);
      setErr("");
      console.log(`Loading past appointments - page ${pageNum}, append: ${append}`);
      
      const res = await listUserAppointments({
        when: "past",
        page: pageNum,
        limit: pastLimit,
        sort: sortOrder
      });
      
      console.log("Past appointments API response:", res);
      
      let appointments = [];
      let totalCount = 0;
      
      if (res?.appointments && Array.isArray(res.appointments)) {
        appointments = res.appointments;
        totalCount = res.total_count || 0;
      } else if (Array.isArray(res)) {
        appointments = res;
        totalCount = res.length;
      } else if (res && typeof res === 'object') {
        // Handle error response
        if (res.error) {
          throw new Error(res.error);
        }
        appointments = [];
        totalCount = 0;
      }
      
      // Backend now excludes cancelled, but filter as safety measure
      const filtered = appointments.filter((a) => !isCancelled(a));
      console.log(`Got ${filtered.length} past appointments from API (total_count: ${totalCount})`);
      
      if (append) {
        setPastAppts(prev => {
          const newList = [...prev, ...filtered];
          setHasMorePast(filtered.length === pastLimit && newList.length < totalCount);
          return newList;
        });
      } else {
        setPastAppts(filtered);
        setHasMorePast(filtered.length === pastLimit && filtered.length < totalCount);
      }
      setPastCount(totalCount);
    } catch (e) {
      console.error("Failed to load past appointments", e);
      setErr(e?.message || "Failed to load past appointments.");
      if (!append) {
        setPastAppts([]);
      }
    } finally {
      setLoadingPast(false);
      console.log("Finished loading past appointments");
    }
  }, [sortOrder, pastLimit]);

  // Load cancelled appointments
  const loadCancelled = useCallback(async (pageNum = 1, append = false) => {
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
      
      if (res?.appointments) {
        if (append) {
          setCancelledAppts(prev => {
            const newList = [...prev, ...res.appointments];
            setHasMoreCancelled(res.appointments.length === cancelledLimit && newList.length < (res.total_count || 0));
            return newList;
          });
        } else {
          setCancelledAppts(res.appointments);
          setHasMoreCancelled(res.appointments.length === cancelledLimit && res.appointments.length < (res.total_count || 0));
        }
        setCancelledCount(res.total_count || res.appointments.length);
      } else if (Array.isArray(res)) {
        if (append) {
          setCancelledAppts(prev => [...prev, ...res]);
        } else {
          setCancelledAppts(res);
        }
        setCancelledCount(res.length);
        setHasMoreCancelled(false);
      } else {
        if (!append) {
          setCancelledAppts([]);
        }
        setCancelledCount(0);
        setHasMoreCancelled(false);
      }
    } catch (e) {
      console.error("Failed to load cancelled appointments", e);
      setErr(e?.message || "Failed to load cancelled appointments.");
      if (!append) {
        setCancelledAppts([]);
      }
    } finally {
      setLoadingCancelled(false);
    }
  }, [cancelledLimit]);

  // Initial load - get counts and load upcoming
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Track which tabs have been loaded to prevent infinite loops
  const [loadedTabs, setLoadedTabs] = useState({
    inprogress: false,
    past: false,
    cancelled: false
  });

  // Load appointments when tab is clicked
  useEffect(() => {
    if (tab === "inprogress" && !loadedTabs.inprogress && !loadingInprogress) {
      console.log("Loading in-progress tab");
      setLoadedTabs(prev => ({ ...prev, inprogress: true }));
      loadInprogress();
    } else if (tab === "past" && !loadedTabs.past && !loadingPast) {
      console.log("Loading past tab");
      setLoadedTabs(prev => ({ ...prev, past: true }));
      setPastPage(1);
      setHasMorePast(false);
      loadPast(1, false);
    } else if (tab === "cancelled" && !loadedTabs.cancelled && !loadingCancelled) {
      console.log("Loading cancelled tab");
      setLoadedTabs(prev => ({ ...prev, cancelled: true }));
      setCancelledPage(1);
      setHasMoreCancelled(false);
      loadCancelled(1, false);
    }
  }, [tab, loadInprogress, loadPast, loadCancelled, loadingInprogress, loadingPast, loadingCancelled, loadedTabs]);

  // Reset and reload when sort changes for past
  useEffect(() => {
    if (tab === "past") {
      setPastPage(1);
      setPastAppts([]);
      setHasMorePast(false);
      loadPast(1, false);
    }
  }, [sortOrder, tab, loadPast]);

  // Handlers
  function onReschedule(appt) { setResAppt(appt); }
  function onCancel(appt) { setCancelAppt(appt); }

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
      // Reload current tab
      if (tab === "upcoming") {
        await loadCounts();
      } else if (tab === "inprogress") {
        await loadInprogress();
      } else if (tab === "past") {
        await loadPast(pastPage, false);
      } else if (tab === "cancelled") {
        await loadCancelled(cancelledPage, false);
      }
    } catch (e) {
      console.error("Failed to save note", e);
    }
  }

  const handleLoadMorePast = () => {
    const nextPage = pastPage + 1;
    setPastPage(nextPage);
    loadPast(nextPage, true);
  };

  const handleLoadMoreCancelled = () => {
    const nextPage = cancelledPage + 1;
    setCancelledPage(nextPage);
    loadCancelled(nextPage, true);
  };

  const handleSortChange = (newSort) => {
    setSortOrder(newSort);
    setPastPage(1);
  };

  const reloadCurrentTab = useCallback(async (cancelledAppointmentId = null) => {
    // If an appointment was just cancelled, immediately remove it from local state
    if (cancelledAppointmentId) {
      setUpcomingAppts(prev => prev.filter(a => a.id !== cancelledAppointmentId));
      setInprogressAppts(prev => prev.filter(a => a.id !== cancelledAppointmentId));
      setUpcomingCount(prev => Math.max(0, prev - 1));
      setInprogressCount(prev => Math.max(0, prev - 1));
    }
    
    if (tab === "upcoming") {
      await loadCounts();
    } else if (tab === "inprogress") {
      await loadInprogress();
    } else if (tab === "past") {
      await loadPast(1, false);
    } else if (tab === "cancelled") {
      await loadCancelled(1, false);
    }
  }, [tab, loadCounts, loadInprogress, loadPast, loadCancelled]);

  const currentAppts = tab === "upcoming" ? upcomingAppts : 
                      tab === "inprogress" ? inprogressAppts :
                      tab === "past" ? pastAppts : cancelledAppts;
  const currentLoading = tab === "upcoming" ? false :
                        tab === "inprogress" ? loadingInprogress :
                        tab === "past" ? loadingPast : loadingCancelled;

  if (countsLoading) {
    return <div className="max-w-6xl mx-auto p-6 text-gray-600">Loading…</div>;
  }

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
          {(tab === "past" || tab === "cancelled") && (
            <div className="text-sm text-gray-600">
              Showing {currentAppts.length} of {tab === "past" ? pastCount : cancelledCount}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-full bg-gray-100 p-1 w-full md:w-[720px]">
        <div className="grid grid-cols-4">
          {[
            ["upcoming", `Upcoming (${upcomingCount})`],
            ["inprogress", `In Progress (${inprogressCount})`],
            ["past", `Past (${pastCount})`],
            ["cancelled", `Cancelled (${cancelledCount})`],
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

      {err && (tab === "past" || tab === "cancelled") && (
        <div className="text-sm text-red-600">{err}</div>
      )}

      {tab === "upcoming" && (
        upcomingAppts.length === 0 ? (
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
        currentLoading && pastAppts.length === 0 ? (
          <div className="text-sm text-gray-600">Loading past appointments…</div>
        ) : pastAppts.length === 0 ? (
          <div className="text-sm text-gray-600">No past appointments.</div>
        ) : (
          <>
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
            {hasMorePast && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMorePast}
                  disabled={currentLoading}
                >
                  {currentLoading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )
      )}

      {tab === "cancelled" && (
        currentLoading && cancelledAppts.length === 0 ? (
          <div className="text-sm text-gray-600">Loading cancelled appointments…</div>
        ) : cancelledAppts.length === 0 ? (
          <div className="text-sm text-gray-600">No cancelled appointments.</div>
        ) : (
          <>
            <div className="space-y-4">
              {cancelledAppts.map((a) => (
                <AppointmentCard key={a.id} appt={a} compact onSaveNote={saveNote} onReviewSubmitted={reloadCurrentTab} />
              ))}
            </div>
            {hasMoreCancelled && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMoreCancelled}
                  disabled={currentLoading}
                >
                  {currentLoading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )
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
          onSuccess={(res) => {
            const cancelledId = cancelAppt?.id;
            setCancelAppt(null);
            reloadCurrentTab(cancelledId);
            // Also reload cancelled tab to show the newly cancelled appointment
            loadCancelled(1, false);
            loadCounts(); // Refresh counts
          }}
        />
      )}
    </div>
  );
}
