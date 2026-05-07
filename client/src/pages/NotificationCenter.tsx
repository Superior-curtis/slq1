import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Bell, Trash2 } from "lucide-react";

export default function NotificationCenter() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: notifications, isLoading, refetch } = trpc.notifications.getNotifications.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated }
  );
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation();

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(
      { notificationId },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "game_invite":
        return "🎮";
      case "game_started":
        return "▶️";
      case "game_finished":
        return "🏁";
      case "rank_change":
        return "📈";
      case "new_challenge":
        return "⚡";
      case "opponent_joined":
        return "👥";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "game_invite":
        return "border-blue-500/30";
      case "rank_change":
        return "border-green-500/30";
      case "new_challenge":
        return "border-purple-500/30";
      default:
        return "border-orange-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/80 backdrop-blur-md border-b border-orange-500/20 sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <motion.div
              className="text-2xl font-bold cursor-pointer"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-orange-500">Porn</span>
              <span className="text-white">Guesser</span>
            </motion.div>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10">
                返回儀表板
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">
              <Bell className="inline-block w-10 h-10 text-orange-500 mr-3" />
              通知中心
            </h1>
            {notifications && notifications.length > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
              >
                全部標記為已讀
              </Button>
            )}
          </div>

          {/* Notifications list */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.05 }}
              className="space-y-4"
            >
              {notifications.map((notif: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-gradient-to-r from-orange-500/10 to-orange-500/5 border ${getNotificationColor(
                    notif.type
                  )} rounded-lg p-4 flex items-start justify-between hover:border-orange-500/40 transition-colors ${
                    !notif.isRead ? "ring-1 ring-orange-500/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-3xl mt-1">{getNotificationIcon(notif.type)}</div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{notif.title}</p>
                      {notif.content && (
                        <p className="text-gray-400 text-sm mt-1">{notif.content}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notif.createdAt).toLocaleString("zh-TW")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!notif.isRead && (
                      <Button
                        onClick={() => handleMarkAsRead(notif.id)}
                        disabled={markAsReadMutation.isPending}
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-black font-bold"
                      >
                        標記已讀
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-12 text-center">
              <Bell className="w-16 h-16 text-orange-500/30 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">暫無通知</p>
              <p className="text-gray-500 text-sm mt-2">當您收到邀請或排名變化時，通知將出現在這裡</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
