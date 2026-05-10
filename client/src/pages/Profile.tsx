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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-400 mb-4">Access Denied</h1>
          <p className="text-orange-300 mb-6">Please log in to view your profile</p>
          <Button onClick={() => navigate("/")} className="bg-orange-500 hover:bg-orange-600 text-black">
            Go to Home
          </Button>
        </div>
      </div>
    );
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

          <Button asChild variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-3xl font-bold">
                {user?.name?.[0]?.toUpperCase() || "P"}
              </div>
              <div>
                <h1 className="text-4xl font-bold text-orange-400">{user?.name || "Player"}</h1>
                <p className="text-orange-300 mt-2">Rank #{playerRank?.rank || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          {statsLoading ? (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : stats ? (
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                <p className="text-gray-400 text-sm">Total Score</p>
                <p className="text-4xl font-bold text-orange-400 mt-2">{stats.totalScore}</p>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                <p className="text-gray-400 text-sm">Games Played</p>
                <p className="text-4xl font-bold text-orange-400 mt-2">{stats.gamesPlayed}</p>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                <p className="text-gray-400 text-sm">Games Won</p>
                <p className="text-4xl font-bold text-orange-400 mt-2">{stats.gamesWon}</p>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-4xl font-bold text-orange-400 mt-2">{stats.winRate}%</p>
              </Card>
            </div>
          ) : null}

          {/* Game History */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-orange-400">Game History</h2>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : history && history.length > 0 ? (
              <div className="space-y-3">
                {history.map((game: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-orange-400">
                          {game.roomType === "random" ? "🎲 Random Match" : game.roomType === "bot" ? "🤖 vs Bot" : "⚔️ Duel"}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Mode: {game.gameMode === "picture" ? "🖼️ Picture" : "🎬 Video"}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(game.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${game.result === "win" ? "text-green-400" : "text-red-400"}`}>
                          {game.result === "win" ? "✅ Win" : "❌ Loss"}
                        </p>
                        <p className="text-sm text-orange-400 mt-1">+{game.score} pts</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 p-8 text-center">
                <p className="text-gray-400">No game history yet</p>
                <Button asChild className="mt-4 bg-orange-500 hover:bg-orange-600 text-black">
                  <Link href="/game/picture">Play Your First Game</Link>
                </Button>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
