import { RoleGate } from "../../shared/routing/RoleGate.jsx";
import Orders from "./pages/Orders.jsx";

export default [
  {
    path: "/orders",
    element: <RoleGate allow={["customer"]}><Orders /></RoleGate>,
  },
];

