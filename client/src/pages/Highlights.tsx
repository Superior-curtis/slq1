import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Heart, Play, TrendingUp, Award } from "lucide-react";

export default function Highlights() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [selectedTab, setSelectedTab] = useState<"top" | "trending">("top");

  const { data: topHighlights, isLoading: topLoading } = trpc.highlights.getTopHighlights.useQuery({
    limit: 20,
  });

  const { data: trendingHighlights, isLoading: trendingLoading } = trpc.highlights.getTrendingHighlights.useQuery({
    limit: 20,
  });

  const likeHighlightMutation = trpc.highlights.likeHighlight.useMutation();

  const highlights = selectedTab === "top" ? topHighlights : trendingHighlights;
  const isLoading = selectedTab === "top" ? topLoading : trendingLoading;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/80 backdrop-blur-md border-b border-orange-500/20 sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-orange-500">Porn</span>
            <span className="text-white">Guesser</span>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
              onClick={() => navigate("/lobby")}
            >
              大廳
            </Button>
            <Button
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
              onClick={() => navigate("/leaderboard")}
            >
              排行榜
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-orange-500">精選</span>
            <span className="text-white">重播</span>
          </h1>
          <p className="text-gray-400 text-lg">觀看過去最精彩刺激的遊戲對戰回合</p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-4 mb-8"
        >
          <Button
            onClick={() => setSelectedTab("top")}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
              selectedTab === "top"
                ? "bg-orange-500 text-white"
                : "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
            }`}
          >
            <Award className="w-5 h-5" />
            最高評分
          </Button>
          <Button
            onClick={() => setSelectedTab("trending")}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
              selectedTab === "trending"
                ? "bg-orange-500 text-white"
                : "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            熱門趨勢
          </Button>
        </motion.div>

        {/* Highlights Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.05 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {highlights?.map((highlight: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 overflow-hidden group hover:border-orange-500/60 transition-all cursor-pointer"
                  onClick={() => navigate(`/highlight/${highlight.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-40 bg-black/50 overflow-hidden">
                    <img
                      src={highlight.thumbnail || "https://via.placeholder.com/300x200?text=Highlight"}
                      alt={highlight.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <Play className="w-12 h-12 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-bold text-sm line-clamp-2">{highlight.title}</h3>

                    {/* Players */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div>
                        <p className="font-semibold text-orange-400">{highlight.player1Name}</p>
                        <p className="text-gray-500">vs</p>
                        <p className="font-semibold text-orange-400">{highlight.player2Name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-400">{highlight.player1Score}</p>
                        <p className="text-gray-500">-</p>
                        <p className="text-lg font-bold text-orange-400">{highlight.player2Score}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-2 border-t border-orange-500/20">
                      <div className="flex items-center gap-1 text-sm">
                        <Heart className="w-4 h-4 text-red-500" />
                        <span className="text-gray-400">{highlight.likes || 0}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(highlight.createdAt).toLocaleDateString("zh-TW")}
                      </span>
                    </div>

                    {/* Like Button */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        likeHighlightMutation.mutate({ id: highlight.id });
                      }}
                      disabled={likeHighlightMutation.isPending}
                      className="w-full bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border border-orange-500/30 text-sm"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {likeHighlightMutation.isPending ? "加入中..." : "加入收藏"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && (!highlights || highlights.length === 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-gray-400 text-lg">暫無精選重播</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
