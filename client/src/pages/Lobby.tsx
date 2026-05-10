import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Send, Users, MessageCircle, Zap } from "lucide-react";

export default function Lobby() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  const { data: onlinePlayers } = trpc.lobby.getOnlinePlayers.useQuery();
  const { data: lobbyStats } = trpc.lobby.getLobbyStats.useQuery();
  const { data: topPlayers } = trpc.lobby.getTopPlayers.useQuery({ limit: 10 });

  const { data: lobbyMessages, refetch: refetchMessages } = trpc.chat.getLobbyMessages.useQuery({
    limit: 50,
  });

  const sendMessageMutation = trpc.chat.sendLobbyMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchMessages();
    },
  });

  useEffect(() => {
    if (lobbyMessages) {
      setMessages(lobbyMessages);
    }
  }, [lobbyMessages]);

  const handleSendMessage = () => {
    if (!message.trim() || !isAuthenticated) return;
    sendMessageMutation.mutate({ message });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-400 mb-4">Access Denied</h1>
          <p className="text-orange-300 mb-6">Please log in to access the lobby</p>
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
          <div className="text-2xl font-bold cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-orange-500">Porn</span>
            <span className="text-white">Guesser</span>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10" onClick={() => navigate("/leaderboard")}>
              Leaderboard
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Chat */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 h-[600px] flex flex-col">
              {/* Chat header */}
              <div className="border-b border-orange-500/20 p-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-orange-500" />
                  Global Lobby Chat
                </h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/30 rounded-lg p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold">
                          {msg.userName?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-orange-400">{msg.userName}</p>
                          <p className="text-gray-300 text-sm break-words">{msg.message}</p>
                          <p className="text-gray-600 text-xs mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="border-t border-orange-500/20 p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="bg-black/50 border-orange-500/30 text-white placeholder-gray-500"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending || !message.trim()}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Right: Stats and Players */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Stats */}
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                Lobby Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Online Players</span>
                  <span className="text-2xl font-bold text-orange-400">{lobbyStats?.onlinePlayers || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Active Games</span>
                  <span className="text-2xl font-bold text-orange-400">{lobbyStats?.inGamePlayers || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Games</span>
                  <span className="text-2xl font-bold text-orange-400">{lobbyStats?.totalGamesPlayed || 0}</span>
                </div>
              </div>
            </Card>

            {/* Top Players */}
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30 p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Top Players
              </h3>
              <div className="space-y-2">
                {topPlayers?.map((player: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between bg-black/30 rounded p-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-bold text-orange-400 w-6">#{idx + 1}</span>
                      <span className="text-sm truncate">{player.name}</span>
                    </div>
                    <span className="text-orange-400 font-bold text-sm">{player.totalScore}</span>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
