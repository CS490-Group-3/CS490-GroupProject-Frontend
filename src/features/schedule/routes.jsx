import { lazy } from "react";
import { RoleGate } from "../../shared/routing/RoleGate.jsx";

const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard.jsx"));
const BarberSalon = lazy(() => import("./pages/BarberSalon.jsx"));

export default [
  { 
    path: "/schedule", 
    element: <RoleGate allow={["owner", "salon_owner", "barber"]}><ProviderDashboard /></RoleGate> 
  },
  {
    path: "/my-salon",
    element: <RoleGate allow={["barber"]}><BarberSalon /></RoleGate>
  }
];
