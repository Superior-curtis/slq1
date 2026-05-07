import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.profile.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: history, isLoading: historyLoading } = trpc.profile.getHistory.useQuery(
    { limit: 20 },
    { enabled: isAuthenticated }
  );
  const { data: playerRank } = trpc.leaderboard.getPlayerRank.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

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

          <Link href="/dashboard">
            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回儀表板
            </Button>
          </Link>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Profile header */}
          <div className="bg-gradient-to-r from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">{user?.name}</h1>
                <p className="text-gray-400">{user?.email}</p>
              </div>
              {playerRank && (
                <div className="text-right">
                  <p className="text-gray-400 text-sm">全球排名</p>
                  <p className="text-5xl font-bold text-orange-400">#{playerRank.rank}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Stats cards */}
            {statsLoading ? (
              <div className="md:col-span-3 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : stats ? (
              <>
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                  <p className="text-gray-400 text-sm mb-2">總積分</p>
                  <p className="text-4xl font-bold text-orange-400">{stats.totalScore}</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                  <p className="text-gray-400 text-sm mb-2">遊戲次數</p>
                  <p className="text-4xl font-bold text-orange-400">{stats.gamesPlayed}</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                  <p className="text-gray-400 text-sm mb-2">勝利次數</p>
                  <p className="text-4xl font-bold text-orange-400">{stats.gamesWon}</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                  <p className="text-gray-400 text-sm mb-2">勝率</p>
                  <p className="text-4xl font-bold text-orange-400">{stats.winRate}%</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                  <p className="text-gray-400 text-sm mb-2">正確率</p>
                  <p className="text-4xl font-bold text-orange-400">{stats.accuracy}%</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                  <p className="text-gray-400 text-sm mb-2">平均反應時間</p>
                  <p className="text-4xl font-bold text-orange-400">
                    {stats.correctAnswers}/{stats.totalAnswers}
                  </p>
                </Card>
              </>
            ) : null}
          </div>

          {/* Game history */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-orange-500">最近遊戲紀錄</h2>
            {historyLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.05 }}
                className="space-y-4"
              >
                {history && history.length > 0 ? (
                  history.map((game, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold">
                          {game.gameMode === "picture" ? "🖼️ 圖片模式" : "🎬 影片模式"}
                          {" · "}
                          {game.roomType === "random" ? "隨機配對" : "決鬥模式"}
                        </p>
                        <p className="text-sm text-gray-400">
                          排名: #{game.rank} · 正確率: {game.correctAnswers}/{game.totalAnswers}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-400">{game.score}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(game.createdAt).toLocaleDateString("zh-TW")}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-8">暫無遊戲紀錄</p>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
