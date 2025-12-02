import { lazy } from "react";
import { RoleGate } from "../../shared/routing/RoleGate.jsx";

const Profile = lazy(() => import("./pages/Profile.jsx"));

export default [
  {
    path: "/profile",
    element: <RoleGate allow={["customer", "owner", "salon_owner", "barber", "admin"]}><Profile /></RoleGate>,
  },
];
