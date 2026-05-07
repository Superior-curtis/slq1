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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-400 mb-4">Access Denied</h1>
          <p className="text-orange-300 mb-6">Please log in to access the dashboard</p>
          <Button onClick={() => navigate("/")} className="bg-orange-500 hover:bg-orange-600 text-black">
            Go to Home
          </Button>
        </div>
      </div>
    );
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
              Logout
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
            <h2 className="text-3xl font-bold mb-6 text-orange-500">Select Game Mode</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/game/picture">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-8 cursor-pointer hover:border-orange-500/60 transition-colors"
                >
                  <div className="text-5xl mb-4">🖼️</div>
                  <h3 className="text-2xl font-bold mb-2">Picture Mode</h3>
                  <p className="text-gray-400 mb-4">
                    Guess details from adult video screenshots
                  </p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold w-full">
                    Start Game
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
                  <h3 className="text-2xl font-bold mb-2">Video Mode</h3>
                  <p className="text-gray-400 mb-4">
                    Watch video clips and test your knowledge
                  </p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold w-full">
                    Start Game
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-orange-500">Your Stats</h2>
            {statsLoading ? (
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">Total Score</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.totalScore}</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">Games Played</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.gamesPlayed}</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">Games Won</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.gamesWon}</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">Win Rate</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.winRate}%</p>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-4">
                  <p className="text-gray-400 text-sm">Accuracy</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {stats.totalAnswers > 0 ? ((stats.correctAnswers / stats.totalAnswers) * 100).toFixed(1) : 0}%
                  </p>
                </Card>

                <Link href="/leaderboard">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold mt-4">
                    View Leaderboard
                  </Button>
                </Link>

                <Link href="/profile">
                  <Button variant="outline" className="w-full border-orange-500 text-orange-500 hover:bg-orange-500/10">
                    Profile
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
