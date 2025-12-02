import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Check, CheckCheck, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/ui/dialog.jsx";
import { Button } from "../../../shared/ui/button.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../shared/ui/tabs.jsx";
import { useAuth } from "../../../features/auth/auth-provider.jsx";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../api.js";

/**
 * Categorize notification type into filter categories
 */
function getNotificationCategory(notificationType) {
  if (notificationType === "appointment_reminder") {
    return "reminders";
  }
  if (notificationType === "promotional_offer") {
    return "promos";
  }
  // All other types (barber_running_late, salon_verification, appointment_creation, etc.) are system
  return "system";
}

/**
 * Get deep link URL based on notification type and related_id
 */
function getDeepLinkUrl(notification) {
  const { notification_type, related_id } = notification;
  
  switch (notification_type) {
    case "appointment_reminder":
    case "appointment_creation":
    case "appointment_confirmation":
    case "barber_running_late":
      // Navigate to appointments page
      return `/appointments`;
    case "promotional_offer":
      // Navigate to salon profile if related_id is salon_id
      if (related_id) {
        return `/salon/${related_id}`;
      }
      return null;
    case "salon_verification":
      // Navigate to salon dashboard for owners
      return `/salon-dashboard`;
    default:
      // For other system notifications, navigate to notifications page
      return `/notifications`;
  }
}

export default function NotificationDrawer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all, reminders, promos, system
  const navigate = useNavigate();

  // Load notifications and unread count
  const loadNotifications = async () => {
    // Only load if user is authenticated
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const [notifs, count] = await Promise.all([
        getNotifications().catch((err) => {
          console.warn("Failed to load notifications (non-critical):", err);
          return [];
        }),
        getUnreadCount().catch((err) => {
          console.warn("Failed to load unread count (non-critical):", err);
          return 0;
        }),
      ]);
      console.log("Loaded notifications:", notifs);
      console.log("Unread count:", count);
      setNotifications(notifs || []);
      setUnreadCount(count || 0);
    } catch (error) {
      // Silently handle CORS/network errors - these are backend configuration issues
      if (!error.message?.includes("Failed to fetch") && !error.message?.includes("CORS")) {
        console.error("Failed to load notifications:", error);
      }
      // Don't show error to user, just set empty state
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and when drawer opens
  useEffect(() => {
    if (user) {
      loadNotifications();
      // Refresh periodically when drawer is open
      if (open) {
        const interval = setInterval(loadNotifications, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
      }
    }
  }, [user, open]);

  // Filter notifications based on selected tab
  const filteredNotifications = useMemo(() => {
    if (filter === "all") {
      return notifications;
    }
    return notifications.filter((notif) => 
      getNotificationCategory(notif.notification_type) === filter
    );
  }, [notifications, filter]);

  // Handle marking a notification as read
  const handleMarkAsRead = async (notificationId, e) => {
    e?.stopPropagation();
    try {
      await markAsRead(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, status: "read" } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async (e) => {
    e?.stopPropagation();
    try {
      await markAllAsRead();
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, status: "read" }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Handle clearing all notifications (mark all as read and clear local state)
  const handleClearAll = async (e) => {
    e?.stopPropagation();
    try {
      // Mark all as read first
      await markAllAsRead();
      // Clear local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
    }
  };

  // Handle notification click - navigate to deep link
  const handleNotificationClick = (notification) => {
    const url = getDeepLinkUrl(notification);
    if (url) {
      navigate(url);
      setOpen(false);
    }
    // Mark as read when clicked
    if (notification.status !== "read") {
      handleMarkAsRead(notification.id);
    }
  };

  // Render notification list content
  const renderNotificationList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-500">Loading notifications...</p>
        </div>
      );
    }
    if (filteredNotifications.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-500">No notifications</p>
        </div>
      );
    }
    return (
      <div className="space-y-2 pr-2">
        {filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              notification.status === "read"
                ? "bg-white border-gray-200 hover:bg-gray-50"
                : "bg-blue-50 border-blue-200 hover:bg-blue-100"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-gray-900">
                    {notification.title}
                  </h4>
                  {notification.status !== "read" && (
                    <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
              {notification.status !== "read" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => handleMarkAsRead(notification.id, e)}
                  aria-label="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      <style>{`
        [data-slot="dialog-content"] > button:last-of-type {
          display: none !important;
        }
      `}</style>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-600 rounded-full border-2 border-white"></span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="!fixed !top-0 !right-0 !left-auto !bottom-0 !translate-x-0 !translate-y-0 !h-screen !rounded-none !border-l !border-t-0 !border-r-0 !border-b-0 !shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right max-w-md w-full !flex !flex-col !p-0"
        >
            <DialogHeader className="!p-6 !pb-4 !border-b !border-gray-200">
            <div className="flex items-center justify-between">
              <DialogTitle>Notifications</DialogTitle>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear all
                  </Button>
                )}
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogDescription className="sr-only">
              View and manage your notifications
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden !px-6 !pb-6">
            <Tabs value={filter} onValueChange={setFilter} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full !mt-4 flex-shrink-0">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="reminders">Reminders</TabsTrigger>
                <TabsTrigger value="promos">Promos</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>

              {["all", "reminders", "promos", "system"].map((tabValue) => (
                <TabsContent key={tabValue} value={tabValue} className="flex-1 overflow-y-auto mt-4 min-h-0">
                  {renderNotificationList()}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

