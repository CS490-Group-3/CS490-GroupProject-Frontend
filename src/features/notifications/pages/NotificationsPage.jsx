import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCheck } from "lucide-react";
import { Button } from "../../../shared/ui/button.jsx";
import { Badge } from "../../../shared/ui/badge.jsx";
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
      return `/appointments`;
    case "promotional_offer":
      if (related_id) {
        return `/salon/${related_id}`;
      }
      return null;
    case "salon_verification":
      return `/salon-dashboard`;
    default:
      return `/notifications`;
  }
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  // Load notifications and unread count
  const loadNotifications = async () => {
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
      setNotifications(notifs || []);
      setUnreadCount(count || 0);
    } catch (error) {
      // Silently handle CORS/network errors - these are backend configuration issues
      if (!error.message?.includes("Failed to fetch") && !error.message?.includes("CORS")) {
        console.error("Failed to load notifications:", error);
      }
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    loadNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    
    // Refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Refresh when window gains focus
    const handleFocus = () => {
      loadNotifications();
    };
    window.addEventListener("focus", handleFocus);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filter notifications
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
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, status: "read" }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    const url = getDeepLinkUrl(notification);
    if (url) {
      navigate(url);
    }
    if (notification.status !== "read") {
      handleMarkAsRead(notification.id);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-500">Please sign in to view notifications.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="all">
            All
            {filter === "all" && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="promos">Promos</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
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
                        <h4 className="font-semibold text-base text-gray-900">
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
                        className="h-8 w-8 flex-shrink-0"
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

