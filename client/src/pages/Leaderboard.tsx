import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Trophy, Medal } from "lucide-react";

export default function Leaderboard() {
  const { isAuthenticated } = useAuth();
  const { data: leaderboard, isLoading } = trpc.leaderboard.getTopPlayers.useQuery({
    limit: 100,
  });

  const { data: playerRank } = trpc.leaderboard.getPlayerRank.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
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
            {isAuthenticated && (
              <Link href="/dashboard">
                <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10">
                  回到儀表板
                </Button>
              </Link>
            )}
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
              <Trophy className="inline-block w-10 h-10 text-orange-500 mr-3" />
              全球排行榜
            </h1>
          </div>

          {/* Player's current rank */}
          {isAuthenticated && playerRank && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-r from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-6 mb-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">您的排名</p>
                  <p className="text-3xl font-bold text-orange-400">
                    #{playerRank.rank}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">積分</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {playerRank.totalScore}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">百分比</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {playerRank.percentile}%
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Leaderboard table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.05 }}
              className="space-y-2"
            >
              {leaderboard?.map((player: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-4 flex items-center justify-between hover:border-orange-500/40 transition-colors ${
                    idx < 3 ? "ring-1 ring-orange-500/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl font-bold w-12 text-center">
                      {getMedalIcon(player.rank)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">玩家 #{player.userId}</p>
                      <p className="text-sm text-gray-400">
                        {player.gamesPlayed} 場遊戲 · {player.gamesWon} 場勝利
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-400">
                      {player.totalScore}
                    </p>
                    <p className="text-sm text-gray-400">
                      勝率: {player.winRate.toFixed(1)}%
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
