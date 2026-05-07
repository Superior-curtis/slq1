import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, LogOut } from "lucide-react";

export default function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.profile.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
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
            <span className="text-sm text-gray-400">{user?.name}</span>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-3 gap-8"
        >
          {/* Game Mode Selection */}
          <div className="md:col-span-2">
            <h2 className="text-3xl font-bold mb-6 text-orange-500">選擇遊戲模式</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/game/picture">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-8 cursor-pointer hover:border-orange-500/60 transition-colors"
                >
                  <div className="text-5xl mb-4">🖼️</div>
                  <h3 className="text-2xl font-bold mb-2">圖片模式</h3>
                  <p className="text-gray-400 mb-4">
                    猜測成人影片截圖中的演員、片名等資訊
                  </p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold w-full">
                    開始遊戲
                  </Button>
                </motion.div>
              </Link>

              <Link href="/game/video">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-8 cursor-pointer hover:border-orange-500/60 transition-colors"
                >
                  <div className="text-5xl mb-4">🎬</div>
                  <h3 className="text-2xl font-bold mb-2">影片模式</h3>
                  <p className="text-gray-400 mb-4">
                    觀看影片片段，挑戰您的知識與反應速度
                  </p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold w-full">
                    開始遊戲
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-orange-500">您的統計</h2>
            {statsLoading ? (
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">總積分</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.totalScore}</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">遊戲次數</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.gamesPlayed}</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">勝利次數</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.gamesWon}</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">勝率</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.winRate}%</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">正確率</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.accuracy}%</p>
                </Card>

                <Link href="/leaderboard">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold mt-4">
                    查看排行榜
                  </Button>
                </Link>

                <Link href="/profile">
                  <Button variant="outline" className="w-full border-orange-500 text-orange-500 hover:bg-orange-500/10">
                    詳細資料
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
