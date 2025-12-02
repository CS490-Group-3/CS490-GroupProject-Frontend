import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/ui/dialog.jsx";
import PaymentForm from "./PaymentForm.jsx";

export default function PaymentModal({ 
  open, 
  onOpenChange, 
  appointmentId,  // For existing appointments
  appointmentData, // For new appointments (creates with payment)
  amount, 
  salonId,
  onSuccess 
}) {
  const handleSuccess = (result) => {
    onSuccess(result);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Enter your payment information to complete the appointment booking.
            {appointmentData && " Your appointment will be created after payment succeeds."}
          </DialogDescription>
        </DialogHeader>
        <PaymentForm
          appointmentId={appointmentId}
          appointmentData={appointmentData}
          amount={amount}
          salonId={salonId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          showLoyaltyRedemption={true}
        />
      </DialogContent>
    </Dialog>
  );
}

