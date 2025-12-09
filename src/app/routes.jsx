import authRoutes from "../features/auth/routes.jsx";
import bookingRoutes from "../features/booking/routes.jsx";
import loyaltyRoutes from "../features/loyalty/routes.jsx";
import profileRoutes from "../features/profile/routes.jsx";
import dashboardRoutes from "../features/dashboard/routes.jsx";
import customerManagementRoutes from "../features/customer-management/routes.jsx";
import shopRoutes from "../features/shop/routes.jsx";
import paymentsRoutes from "../features/payments/routes.jsx";
import salonRegRoutes from "../features/salon-reg/routes.jsx";
import scheduleRoutes from "../features/schedule/routes.jsx";
import adminRoutes from "../features/admin/routes.jsx";
import homeRoutes from "../features/home/routes.jsx";
import notificationsRoutes from "../features/notifications/routes.jsx";
import ordersRoutes from "../features/orders/routes.jsx";
import NotFound from "./NotFound.jsx";

export default [
    ...homeRoutes,
    ...authRoutes,
    ...bookingRoutes,
    ...loyaltyRoutes,
    ...profileRoutes,
    ...ordersRoutes,
    ...dashboardRoutes,
    ...customerManagementRoutes,
    ...shopRoutes,
    ...paymentsRoutes,
    ...salonRegRoutes,
    ...scheduleRoutes,
    ...adminRoutes,
    ...notificationsRoutes,
    { path: "*", element: <NotFound /> },
];
