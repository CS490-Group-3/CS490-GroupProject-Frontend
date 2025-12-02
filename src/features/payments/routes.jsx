import { lazy } from "react";
import { RoleGate } from "../../shared/routing/RoleGate.jsx";

const Payments = lazy(() => import("./pages/Payments.jsx"));
const SavedPaymentMethods = lazy(() => import("./pages/SavedPaymentMethods.jsx"));

export default [
  {
    path: "/payments",
    element: <RoleGate allow={["owner", "salon_owner"]}><Payments /></RoleGate>,
  },
  {
    path: "/payment-methods",
    element: <SavedPaymentMethods />,
  },
];
