import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Badge } from "../../../shared/ui/badge";
import { Textarea } from "../../../shared/ui/textarea";
import { Label } from "../../../shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../shared/ui/dialog";
import { Alert, AlertDescription } from "../../../shared/ui/alert";
import { CheckCircle, XCircle, Clock, FileText, MapPin, Phone, Mail, Building2, AlertCircle } from "lucide-react";
import { ImageWithFallback } from "../../../shared/ui/ImageWithFallback";
import { getPendingSalons, approveSalon, rejectSalon, getSalonStatusHistory } from "../api.js";

export default function AdminVerify() {
  const [pendingSalons, setPendingSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadPendingSalons();
  }, []);

  const loadPendingSalons = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const salons = await getPendingSalons();
      setPendingSalons(salons || []);
    } catch (error) {
      console.error("Failed to load pending salons:", error);
      setErrorMessage(error.error || "Failed to load pending salon applications");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSalon) return;

    setActionLoading(true);
    setErrorMessage("");
    try {
      await approveSalon(selectedSalon.id);
      setSuccessMessage(`${selectedSalon.name} has been approved successfully.`);
      setShowApproveDialog(false);
      setSelectedSalon(null);
      await loadPendingSalons();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Failed to approve salon:", error);
      setErrorMessage(error.error || "Failed to approve salon");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSalon || !rejectionReason.trim()) return;

    setActionLoading(true);
    setErrorMessage("");
    try {
      await rejectSalon(selectedSalon.id, rejectionReason.trim());
      setSuccessMessage(`${selectedSalon.name} has been rejected. The owner has been notified.`);
      setShowRejectDialog(false);
      setSelectedSalon(null);
      setRejectionReason("");
      await loadPendingSalons();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Failed to reject salon:", error);
      setErrorMessage(error.error || "Failed to reject salon");
    } finally {
      setActionLoading(false);
    }
  };

  const openApproveDialog = (salon) => {
    setSelectedSalon(salon);
    setShowApproveDialog(true);
    setErrorMessage("");
  };

  const openRejectDialog = (salon) => {
    setSelectedSalon(salon);
    setShowRejectDialog(true);
    setRejectionReason("");
    setErrorMessage("");
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-gray-600">Loading pending applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Salon Verification</h1>
        <p className="text-gray-600 mt-2">Review and approve pending salon applications</p>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {pendingSalons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-lg font-semibold text-gray-700">No pending applications</p>
            <p className="text-sm text-gray-500 mt-2">All salon applications have been reviewed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingSalons.map((salon) => (
            <Card key={salon.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <ImageWithFallback
                      src={salon.logo_url}
                      alt={salon.name}
                      className="w-24 h-24 object-cover rounded-lg border-2 border-white shadow-sm"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-2xl">{salon.name}</CardTitle>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Review
                        </Badge>
                      </div>
                      <CardDescription className="text-base mt-1">{salon.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Business Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">{salon.address}</p>
                            {salon.city && salon.state && (
                              <p className="text-gray-600">
                                {salon.city}, {salon.state} {salon.zip_code || ""}
                              </p>
                            )}
                          </div>
                        </div>
                        {salon.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{salon.phone}</span>
                          </div>
                        )}
                        {salon.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{salon.email}</span>
                          </div>
                        )}
                        {salon.timezone && (
                          <div className="text-gray-600">
                            <span className="font-medium">Timezone:</span> {salon.timezone}
                          </div>
                        )}
                      </div>
                    </div>

                    {salon.license_url && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Business License
                        </h3>
                        <a
                          href={salon.license_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          <FileText className="h-4 w-4" />
                          View License Document
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Application Details</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Status:</span>{" "}
                          <Badge variant="outline" className="ml-2">
                            {salon.status}
                          </Badge>
                        </div>
                        {salon.created_at && (
                          <div>
                            <span className="font-medium">Submitted:</span>{" "}
                            {new Date(salon.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button
                    onClick={() => openApproveDialog(salon)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Application
                  </Button>
                  <Button
                    onClick={() => openRejectDialog(salon)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Salon Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{selectedSalon?.name}</strong>? The salon owner will be
              notified and can immediately start accepting bookings.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              Please verify that the business license is valid and all information is accurate before approving.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
              {actionLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Salon
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Salon Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting <strong>{selectedSalon?.name}</strong>. The salon owner will receive
              this message and can resubmit their application after addressing the issues.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this application is being rejected (e.g., Invalid business license, incomplete information, etc.)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <Alert>
              <AlertDescription>
                This reason will be sent to the salon owner via notification and email.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading}
            >
              {actionLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
