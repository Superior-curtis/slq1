import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Zap, Users, Trophy, Flame, Bell } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-orange-500/20"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            className="text-2xl font-bold"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-orange-500">Porn</span>
            <span className="text-white">Guesser</span>
          </motion.div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-400">
                  Welcome, {user?.name}
                </span>
                <Link href="/notifications">
                  <Button variant="ghost" className="text-orange-500 hover:bg-orange-500/10">
                    <Bell className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10">
                    Enter Game
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold">
                  Login to Play
                </Button>
              </Link>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Animated background elements */}
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(255, 140, 0, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, rgba(255, 140, 0, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(255, 140, 0, 0.1) 0%, transparent 50%)",
            ],
          } as any}
          transition={{ duration: 8, repeat: Infinity }}
        />

        {/* Floating orbs */}
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        />

        {/* Main content */}
        <motion.div
          className="relative z-10 container mx-auto px-4 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="text-6xl md:text-8xl font-black mb-6 leading-tight"
          >
            <motion.span
              className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent block"
              animate={{ textShadow: ["0 0 20px rgba(255, 140, 0, 0.5)", "0 0 40px rgba(255, 140, 0, 0.8)", "0 0 20px rgba(255, 140, 0, 0.5)"] } as any}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Porn Guesser
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            終極成人影片猜謎競技平台 · 即時多人對戰 · Global Leaderboard爭霸
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            {isAuthenticated ? (
              <>
                <Link href="/game/picture">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold px-8 py-6 text-lg">
                      開始Picture Mode
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/game/video">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10 px-8 py-6 text-lg">
                      開始Video Mode
                    </Button>
                  </motion.div>
                </Link>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold px-8 py-6 text-lg">
                    立即Login to Play
                  </Button>
                </motion.div>
              </a>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            {[
              { icon: Users, label: "全球玩家", value: "10K+" },
              { icon: Trophy, label: "進行中的遊戲", value: "500+" },
              { icon: Flame, label: "每日挑戰", value: "365" },
              { icon: Zap, label: "即時對戰", value: "24/7" },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-4"
                whileHover={{ scale: 1.05, borderColor: "rgba(255, 140, 0, 0.5)" }}
              >
                <stat.icon className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-orange-400">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 bg-gradient-to-b from-black to-orange-950/10">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-center mb-16"
          >
            <span className="text-orange-500">遊戲特色</span>
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Picture Mode",
                description: "Guess from adult video screenshots中的演員、片名等資訊",
                icon: "🖼️",
              },
              {
                title: "Video Mode",
                description: "Watch video clips，挑戰您的知識與反應速度",
                icon: "🎬",
              },
              {
                title: "即時對戰",
                description: "與全球玩家進行 1v1 或多人同步競技",
                icon: "⚡",
              },
              {
                title: "排行榜爭霸",
                description: "累積積分，登上全球前 100 名排行榜",
                icon: "🏆",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-lg p-6 hover:border-orange-500/40 transition-colors"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-orange-400">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-black border-t border-orange-500/20 py-8"
      >
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>© 2026 Porn Guesser. 所有權利保留。</p>
          <p className="text-sm mt-2">
            成人內容平台 · 18+ 專用 · 責任遊戲
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
