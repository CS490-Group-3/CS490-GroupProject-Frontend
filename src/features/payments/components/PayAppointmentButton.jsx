import { useState } from "react";
import { Button } from "../../../shared/ui/button.jsx";
import PaymentModal from "./PaymentModal.jsx";

/**
 * Button component that triggers payment for an appointment
 * Shows payment modal when clicked
 */
export default function PayAppointmentButton({ appointment, onPaymentSuccess }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const handlePaymentSuccess = (result) => {
    setPaymentStatus("paid");
    if (onPaymentSuccess) {
      onPaymentSuccess(result);
    }
  };

  // Don't show button if already paid
  if (appointment.payment_status === "paid" || paymentStatus === "paid") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        Paid
      </span>
    );
  }

  const servicePrice = appointment.service?.price || 0;
  const salonId = appointment.salon_id || appointment.salon?.id;

  return (
    <>
      <Button
        size="sm"
        onClick={() => setShowPaymentModal(true)}
        disabled={!appointment.id || servicePrice <= 0}
      >
        Pay Now
      </Button>
      
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        appointmentId={appointment.id}
        amount={servicePrice}
        salonId={salonId}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}

