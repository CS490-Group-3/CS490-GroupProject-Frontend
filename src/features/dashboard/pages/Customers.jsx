import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../shared/api/client.js";
import { getSalonCustomers, getCustomerAppointments, updateAppointmentStatus, markAppointmentComplete, respondToReview } from "../../salon-reg/api.js";
import { refreshSignedUrl } from "../../booking/api.js";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Textarea } from "../../../shared/ui/textarea";
import { ArrowLeft, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Filter, MessageSquare, Star } from "lucide-react";

export default function Customers() {
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [salonId, setSalonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsLimit] = useState(100);
  const [appointmentsTotal, setAppointmentsTotal] = useState(0);
  
  // Filtering state
  const [filterWhen, setFilterWhen] = useState("all"); // all, upcoming, past
  const [filterStatus, setFilterStatus] = useState(null); // null, completed, cancelled, no_show, scheduled, confirmed
  const [sortOrder, setSortOrder] = useState("desc"); // desc = newest first, asc = oldest first (only for past)
  
  // Status change modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  
  // Review response state
  const [respondingToReview, setRespondingToReview] = useState(null);
  const [reviewResponse, setReviewResponse] = useState("");

  useEffect(() => {
    loadSalonData();
  }, []);

  const loadSalonData = async () => {
    try {
      setLoading(true);
      const res = await api("/salons/mine");
      const salonData = res.salon || null;
      
      if (!salonData || salonData.status !== "verified") {
        navigate("/salon-dashboard");
        return;
      }
      
      setSalon(salonData);
      setSalonId(salonData.id);
      
      // Load customers
      const customersRes = await getSalonCustomers(salonData.id);
      setCustomers(customersRes.customers || []);
    } catch (err) {
      console.error("Error loading salon:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerAppointments = async (customerId, page = 1, when = null, status = null) => {
    setLoadingAppointments(true);
    try {
      const whenParam = when !== null ? when : filterWhen;
      const statusParam = status !== null ? status : filterStatus;
      // For past appointments, use sort_order. For upcoming, always closest first (asc)
      const sort = (whenParam === "past") ? sortOrder : "asc";
      const appointmentsRes = await getCustomerAppointments(salonId, customerId, page, appointmentsLimit, whenParam, statusParam, sort);
      // Handle both array and object response formats
      let appointmentsList = [];
      if (Array.isArray(appointmentsRes)) {
        appointmentsList = appointmentsRes;
        setAppointmentsTotal(appointmentsList.length);
      } else if (appointmentsRes.appointments) {
        appointmentsList = appointmentsRes.appointments;
        setAppointmentsTotal(appointmentsRes.total_count || appointmentsRes.count || appointmentsList.length);
      } else {
        appointmentsList = [];
        setAppointmentsTotal(0);
      }
      // Refresh signed URLs for review images if needed
      const appointmentsWithRefreshedImages = await Promise.all(
        appointmentsList.map(async (apt) => {
          if (apt.review && apt.review.images && apt.review.images.length > 0) {
            const refreshedImages = await Promise.all(
              apt.review.images.map(async (img) => {
                if (img.signed_url) return img;
                if (img.file_url) {
                  try {
                    const result = await refreshSignedUrl(img.file_url, "review-images");
                    return { ...img, signed_url: result.signed_url };
                  } catch (err) {
                    console.error(`Failed to refresh signed URL for ${img.file_url}:`, err);
                    return img;
                  }
                }
                return img;
              })
            );
            return { ...apt, review: { ...apt.review, images: refreshedImages } };
          }
          return apt;
        })
      );
      
      setAppointments(appointmentsWithRefreshedImages);
    } catch (err) {
      console.error("Error loading appointments:", err);
      setAppointments([]);
      setAppointmentsTotal(0);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setAppointmentsPage(1);
    setFilterWhen("all");
    setFilterStatus(null);
    loadCustomerAppointments(customer.user_id, 1);
  };

  const handleFilterChange = (when, status) => {
    setFilterWhen(when);
    // Reset status filter if it's not valid for the new time filter
    if (when === "upcoming" && status && !["scheduled", "cancelled"].includes(status)) {
      setFilterStatus(null);
      status = null;
    } else {
      setFilterStatus(status);
    }
    setAppointmentsPage(1);
    if (selectedCustomer) {
      loadCustomerAppointments(selectedCustomer.user_id, 1, when, status);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    setAppointmentsPage(newPage);
    loadCustomerAppointments(selectedCustomer.user_id, newPage);
  };

  const openStatusModal = (appointment) => {
    setSelectedAppointment(appointment);
    setNewStatus("");
    setCancellationReason("");
    setStatusModalOpen(true);
  };

  const handleStatusChange = async () => {
    if (!selectedAppointment || !newStatus) return;
    
    // Require cancellation reason for cancelled status
    if (newStatus === "cancelled" && !cancellationReason.trim()) {
      alert("Please provide a cancellation reason");
      return;
    }
    
    setChangingStatus(true);
    try {
      if (newStatus === "completed" || newStatus === "no_show") {
        await markAppointmentComplete(selectedAppointment.id, newStatus);
      } else {
        await updateAppointmentStatus(selectedAppointment.id, newStatus, cancellationReason || null);
      }
      setStatusModalOpen(false);
      // Reload appointments
      await loadCustomerAppointments(selectedCustomer.user_id, appointmentsPage);
      alert("Appointment status updated successfully!");
    } catch (error) {
      alert("Failed to update status: " + (error.message || "Unknown error"));
    } finally {
      setChangingStatus(false);
    }
  };

  const handleRespondToReview = async (reviewId) => {
    if (!reviewResponse.trim()) {
      alert("Please enter a response");
      return;
    }
    
    try {
      await respondToReview(reviewId, reviewResponse);
      setRespondingToReview(null);
      setReviewResponse("");
      await loadCustomerAppointments(selectedCustomer.user_id, appointmentsPage);
    } catch (error) {
      alert("Failed to post response: " + (error.message || "Unknown error"));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { icon: CheckCircle2, color: "text-green-600 bg-green-50", label: "Completed" },
      cancelled: { icon: XCircle, color: "text-red-600 bg-red-50", label: "Cancelled" },
      scheduled: { icon: Calendar, color: "text-purple-600 bg-purple-50", label: "Scheduled" },
      no_show: { icon: AlertCircle, color: "text-orange-600 bg-orange-50", label: "No-Show" },
      pending: { icon: AlertCircle, color: "text-yellow-600 bg-yellow-50", label: "Pending" },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const isPastAppointment = (appointment) => {
    if (!appointment.start_at) return false;
    return new Date(appointment.start_at) < new Date();
  };

  const getAvailableStatuses = (appointment) => {
    const isPast = isPastAppointment(appointment);
    if (isPast) {
      return ["completed", "no_show", "cancelled"];
    } else {
      return ["scheduled", "cancelled"];
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate("/salon-dashboard")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Customers</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customers List */}
        <div className="lg:col-span-1 bg-white border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">All Customers</h2>
          {customers.length === 0 ? (
            <p className="text-sm text-gray-600">No customers yet.</p>
          ) : (
            <div className="space-y-2">
              {customers.map((customer) => (
                <div
                  key={customer.user_id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition ${
                    selectedCustomer?.user_id === customer.user_id ? "bg-indigo-50 border-indigo-500" : ""
                  }`}
                >
                  <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                  <div className="text-sm text-gray-500">{customer.email}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {customer.visit_count} {customer.visit_count === 1 ? "confirmed visit" : "confirmed visits"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Details */}
        <div className="lg:col-span-2 bg-white border rounded-2xl p-6">
          {!selectedCustomer ? (
            <div className="text-center py-12 text-gray-600">
              <p>Select a customer to view their details</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </h2>
                <p className="text-gray-600">{selectedCustomer.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedCustomer.visit_count} {selectedCustomer.visit_count === 1 ? "confirmed visit" : "confirmed visits"} total
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Appointment History</h3>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                      value={filterWhen}
                      onChange={(e) => handleFilterChange(e.target.value, filterStatus)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="all">All Time</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                    </select>
                    <select
                      value={filterStatus || ""}
                      onChange={(e) => handleFilterChange(filterWhen, e.target.value || null)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="">All Statuses</option>
                      {filterWhen === "upcoming" ? (
                        <>
                          <option value="scheduled">Scheduled</option>
                          <option value="cancelled">Cancelled</option>
                        </>
                      ) : (
                        <>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no_show">No-Show</option>
                          <option value="scheduled">Scheduled</option>
                        </>
                      )}
                    </select>
                    {filterWhen === "past" && (
                      <select
                        value={sortOrder}
                        onChange={(e) => { setSortOrder(e.target.value); handleFilterChange(filterWhen, filterStatus); }}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    )}
                  </div>
                </div>
                {loadingAppointments ? (
                  <div className="text-center py-8 text-gray-600">Loading appointments...</div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">No appointments found.</div>
                ) : (
                  <>
                    <div className="space-y-4 mb-4">
                      {appointments.map((apt) => {
                        // Handle different response formats
                        const service = apt.service || apt.services || {};
                        const barber = apt.barber || apt.barbers || {};
                        const serviceName = service.name || "Service";
                        const barberName = barber.name || (apt.barber_name) || "N/A";
                        const review = apt.review;
                        const isPast = isPastAppointment(apt);
                        const availableStatuses = getAvailableStatuses(apt);
                        
                        return (
                          <div key={apt.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{serviceName}</div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(apt.status)}
                                <Button
                                  onClick={() => openStatusModal(apt)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Change Status
                                </Button>
                              </div>
                            </div>
                              <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDate(apt.start_at)}
                              </div>
                              {apt.status === "completed" && apt.payment_status === "completed" && (
                                <div className="flex items-center gap-2 text-indigo-600">
                                  <Star className="h-4 w-4" />
                                  <span className="font-medium">
                                    {apt.loyalty_points_earned > 0 
                                      ? `+${apt.loyalty_points_earned} loyalty points earned`
                                      : "Points awarded on completion"}
                                  </span>
                                </div>
                              )}
                              {(apt.status === "scheduled" || apt.status === "confirmed") && apt.payment_status === "completed" && apt.loyalty_points_pending > 0 && (
                                <div className="flex items-center gap-2 text-amber-600">
                                  <Star className="h-4 w-4" />
                                  <span className="font-medium">{apt.loyalty_points_pending} loyalty points pending</span>
                                </div>
                              )}
                              {barberName !== "N/A" && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Barber: {barberName}
                                </div>
                              )}
                              {service.price && (
                                <div className="text-gray-800 font-medium">
                                  ${Number(service.price).toFixed(2)}
                                </div>
                              )}
                              {apt.payment_status && (
                                <div className={`text-sm font-medium ${
                                  apt.payment_status === "completed" ? "text-green-600" : 
                                  apt.payment_status === "pending" ? "text-yellow-600" : 
                                  apt.payment_status === "failed" ? "text-red-600" : 
                                  "text-gray-600"
                                }`}>
                                  Payment: {apt.payment_status === "completed" ? "✓ Paid" : 
                                           apt.payment_status === "pending" ? "Pending" : 
                                           apt.payment_status === "failed" ? "Failed" : 
                                           apt.payment_status}
                                </div>
                              )}
                              {service.duration_minutes && (
                                <div className="text-gray-500">
                                  Duration: {service.duration_minutes} minutes
                                </div>
                              )}
                              {apt.cancellation_reason && (
                                <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                                  <strong>Cancellation Reason:</strong> {apt.cancellation_reason}
                                </div>
                              )}
                            </div>
                            
                            {/* Review Section */}
                            {review && (
                              <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-medium text-sm">
                                      Review by {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : "Customer"}
                                    </span>
                                    <span className="text-yellow-500">
                                      {"★".repeat(review.stars || review.rating)}
                                      <span className="text-gray-300">{"★".repeat(5 - (review.stars || review.rating))}</span>
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{review.text || review.comment || "No written feedback."}</p>
                                
                                {/* Review Images */}
                                {review.images && review.images.length > 0 && (
                                  <div className="mt-3 flex flex-col md:flex-row gap-4">
                                    {(() => {
                                      const beforeImages = review.images.filter(
                                        (img) => img.label === "before" || img.type === "before"
                                      );
                                      const afterImages = review.images.filter(
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
                                                    className="h-32 w-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
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
                                                    className="h-32 w-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
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
                                {review.response && (
                                  <div className="mt-2 p-2 bg-indigo-50 rounded border-l-4 border-indigo-500">
                                    <div className="text-xs font-medium text-indigo-900 mb-1">Owner Response:</div>
                                    <div className="text-xs text-indigo-800">{review.response.response_text}</div>
                                  </div>
                                )}
                                {!review.response && (
                                  <div className="mt-2">
                                    {respondingToReview === review.id ? (
                                      <div className="space-y-2">
                                        <Textarea
                                          value={reviewResponse}
                                          onChange={(e) => setReviewResponse(e.target.value)}
                                          placeholder="Write a response..."
                                          rows={2}
                                          className="text-sm"
                                        />
                                        <div className="flex gap-2">
                                          <Button onClick={() => handleRespondToReview(review.id)} size="sm">
                                            Post Response
                                          </Button>
                                          <Button
                                            onClick={() => {
                                              setRespondingToReview(null);
                                              setReviewResponse("");
                                            }}
                                            variant="outline"
                                            size="sm"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button
                                        onClick={() => setRespondingToReview(review.id)}
                                        variant="outline"
                                        size="sm"
                                      >
                                        <MessageSquare className="h-3 w-3 mr-1" />
                                        Respond
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Pagination */}
                    {appointmentsTotal > appointmentsLimit && (
                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="text-sm text-gray-600">
                          Showing {(appointmentsPage - 1) * appointmentsLimit + 1} to {Math.min(appointmentsPage * appointmentsLimit, appointmentsTotal)} of {appointmentsTotal} appointments
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handlePageChange(appointmentsPage - 1)}
                            disabled={appointmentsPage === 1 || loadingAppointments}
                            variant="outline"
                            size="sm"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            onClick={() => handlePageChange(appointmentsPage + 1)}
                            disabled={appointmentsPage * appointmentsLimit >= appointmentsTotal || loadingAppointments}
                            variant="outline"
                            size="sm"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {statusModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Appointment Status</h3>
            <div className="space-y-4">
              <div>
                <Label>New Status</Label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2 mt-1"
                >
                  <option value="">Select status...</option>
                  {getAvailableStatuses(selectedAppointment).map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace("_", "-")}
                    </option>
                  ))}
                </select>
              </div>
              {newStatus === "cancelled" && (
                <div>
                  <Label>Cancellation Reason *</Label>
                  <Textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Please provide a reason for cancellation..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    setStatusModalOpen(false);
                    setSelectedAppointment(null);
                    setNewStatus("");
                    setCancellationReason("");
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusChange}
                  disabled={!newStatus || changingStatus || (newStatus === "cancelled" && !cancellationReason.trim())}
                >
                  {changingStatus ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
