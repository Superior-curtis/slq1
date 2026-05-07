import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Loader2, Copy, Check, Send, Mic, MicOff, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function GameRoom(props: any = {}) {
  const [location] = useLocation();
  const modeFromUrl = location.split('/').pop() || 'picture';
  const gameMode = (modeFromUrl === 'picture' || modeFromUrl === 'video') ? modeFromUrl : 'picture';
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  
  // Game state
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameType, setGameType] = useState<"random" | "bot" | "duel">("random");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [duelCode, setDuelCode] = useState<string>("");
  
  // Game play state
  const [answer, setAnswer] = useState("");
  const [responseTime, setResponseTime] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [copied, setCopied] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ user: string; message: string; timestamp: Date }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // API queries
  const { data: categories } = trpc.content.getCategories.useQuery();
  const { data: contentData, refetch: refetchContent } = trpc.content.getRandomVideos.useQuery(
    { category: selectedCategory || "all", count: 1 },
    { enabled: gameStarted, staleTime: 0 }
  ) as any;
  
  const createRoomMutation = trpc.game.createRoom.useMutation();
  const submitAnswerMutation = trpc.game.submitAnswer.useMutation();

  // Timer effect - 只在遊戲進行中且未顯示答案時運行
  useEffect(() => {
    if (!gameStarted || showAnswer) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 時間到，自動提交
          setTimeout(() => {
            handleSubmitAnswer();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameStarted, showAnswer]);

  // 每次進入新一輪時重新加載內容
  useEffect(() => {
    if (gameStarted && showAnswer === false && round > 0) {
      refetchContent();
    }
  }, [round, showAnswer, gameStarted, refetchContent]);

  // Create room on mount
  useEffect(() => {
    if (!roomId && isAuthenticated) {
      createRoomMutation.mutate(
        {
          gameMode: gameMode as "picture" | "video",
          roomType: gameType as "random" | "bot" | "duel",
        },
        {
          onSuccess: (data) => {
            if (data) {
              setRoomId(data.id);
              setRoomCode(data.roomCode);
              setGameStarted(true);
              setGameStartTime(Date.now());
              toast.success("Game room created!");
            }
          },
          onError: (error) => {
            toast.error("Failed to create room");
            navigate("/dashboard");
          },
        }
      );
    }
  }, [isAuthenticated]);

  const handleSubmitAnswer = () => {
    if (!roomId) return;

    const time = Date.now() - gameStartTime;
    setResponseTime(time);

    submitAnswerMutation.mutate(
      {
        roomId,
        answer: answer.trim() || "(No answer)",
        responseTime: time,
      },
      {
        onSuccess: (data) => {
          setIsCorrect(data.isCorrect);
          setScore((prev) => prev + (data.score || 0));
          setShowAnswer(true);
          
          if (data.isCorrect) {
            toast.success(`✅ Correct! +${data.score} points`);
          } else {
            const correctAnswer = (contentData as any)?.data?.[0]?.title || (contentData as any)?.[0]?.title || "Unknown";
            toast.error(`❌ Wrong. Answer: ${correctAnswer}`);
          }
        },
        onError: () => {
          toast.error("Failed to submit answer");
          setShowAnswer(true);
        },
      }
    );
  };

  const handleNextRound = () => {
    setRound((prev) => prev + 1);
    setTimeLeft(30);
    setShowAnswer(false);
    setAnswer("");
    setIsCorrect(null);
    setGameStartTime(Date.now());
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    
    const newMessage = {
      user: user?.name || "Anonymous",
      message: chatInput,
      timestamp: new Date(),
    };
    
    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentContent = (contentData as any)?.data?.[0] || (contentData as any)?.[0];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <div className="bg-gradient-to-r from-orange-500/20 to-orange-500/5 border-b border-orange-500/30 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">
              {gameMode === "video" ? "🎬 Video Trivia" : "🖼️ Picture Trivia"}
            </h1>
            <p className="text-sm text-orange-300">
              Mode: {gameType === "random" ? "🎲 Random Match" : gameType === "bot" ? "🤖 vs Bot" : "⚔️ Duel"}
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="border-orange-500/30">
            Back
          </Button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Game Mode Selection */}
          {!gameStarted && (
            <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
              <h2 className="text-lg font-bold mb-4">Select Game Mode</h2>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(["random", "bot", "duel"] as const).map((mode) => (
                  <Button
                    key={mode}
                    onClick={() => setGameType(mode)}
                    variant={gameType === mode ? "default" : "outline"}
                    className={gameType === mode ? "bg-orange-500 text-black" : "border-orange-500/30"}
                  >
                    {mode === "random" ? "🎲 Random" : mode === "bot" ? "🤖 Bot" : "⚔️ Duel"}
                  </Button>
                ))}
              </div>

              {/* Category Selection */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Select Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 bg-black/50 border border-orange-500/30 rounded text-white"
                >
                  <option value="all">All Categories</option>
                  {(categories as any)?.data?.slice(0, 20).map((cat: any) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duel Code Input */}
              {gameType === "duel" && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Duel Room Code</label>
                  <Input
                    placeholder="Enter code or leave empty to create new"
                    value={duelCode}
                    onChange={(e) => setDuelCode(e.target.value)}
                    className="bg-black/50 border-orange-500/30 text-white"
                  />
                </div>
              )}

              <Button onClick={() => setGameStarted(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold">
                Start Game
              </Button>
            </Card>
          )}

          {/* Game Content */}
          {gameStarted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Timer and Round Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 text-center">
                  <p className="text-sm text-red-300">Time Left</p>
                  <p className="text-4xl font-bold text-red-400">{timeLeft}s</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 text-center">
                  <p className="text-sm text-orange-300">Round {round}</p>
                  <p className="text-2xl font-bold text-orange-400">{score} pts</p>
                </Card>
              </div>

              {/* Content Display */}
              <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
                {currentContent ? (
                  gameMode === "video" ? (
                    <div className="w-full aspect-video bg-black rounded overflow-hidden">
                      <iframe
                        src={`https://www.pornhub.com/embed/${currentContent.id || currentContent.videoId}`}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        style={{ border: "none" }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-96 bg-black rounded overflow-hidden flex items-center justify-center">
                      {currentContent.thumbnail ? (
                        <img
                          src={currentContent.thumbnail}
                          alt="Content"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23333' width='400' height='300'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='16'%3EImage unavailable%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <p className="text-orange-300">Image loading...</p>
                      )}
                    </div>
                  )
                ) : (
                  <div className="w-full h-96 flex items-center justify-center">
                    <Loader2 className="animate-spin text-orange-400" size={48} />
                  </div>
                )}
              </Card>

              {/* Answer Section */}
              {!showAnswer ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter your answer..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSubmitAnswer()}
                    className="flex-1 bg-black/50 border-orange-500/30 text-white"
                    disabled={timeLeft === 0}
                  />
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={timeLeft === 0}
                    className="bg-orange-500 hover:bg-orange-600 text-black font-bold"
                  >
                    Submit
                  </Button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <Card className={`p-6 ${isCorrect ? "bg-green-900/30 border-green-500/30" : "bg-red-900/30 border-red-500/30"}`}>
                    <p className="text-lg font-bold mb-2">
                      {isCorrect ? "✅ Correct!" : "❌ Wrong"}
                    </p>
                    <p className="text-sm">
                      Answer: <span className="font-bold text-orange-400">{(currentContent as any)?.title || "Unknown"}</span>
                    </p>
                    <p className="text-sm mt-2">
                      Your answer: <span className="font-bold">{answer || "(No answer)"}</span>
                    </p>
                    <p className="text-sm mt-2">
                      Response time: <span className="font-bold">{(responseTime / 1000).toFixed(1)}s</span>
                    </p>
                  </Card>

                  <div className="flex gap-2">
                    <Button onClick={handleNextRound} className="flex-1 bg-orange-500 text-black font-bold">
                      Next Round
                    </Button>
                    <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1 border-orange-500/30">
                      Exit Game
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        {/* Chat Section */}
        <div className="space-y-4">
          {/* Room Info */}
          {roomCode && (
            <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
              <p className="text-sm text-orange-300 mb-2">Room Code</p>
              <div className="flex gap-2">
                <code className="flex-1 bg-black/50 p-2 rounded font-mono text-orange-400">{roomCode}</code>
                <Button
                  size="sm"
                  onClick={copyRoomCode}
                  className="bg-orange-500 hover:bg-orange-600 text-black"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </Card>
          )}

          {/* Chat */}
          <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 flex flex-col h-96">
            <h3 className="font-bold mb-3 text-orange-300">Game Chat</h3>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-orange-300/50">No messages yet...</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-semibold text-orange-400">{msg.user}:</span>
                    <span className="text-orange-100 ml-2">{msg.message}</span>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Send message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                className="flex-1 bg-black/50 border-orange-500/30 text-white h-8"
              />
              <Button
                size="sm"
                onClick={sendChatMessage}
                className="bg-orange-500 hover:bg-orange-600 text-black"
              >
                <Send size={16} />
              </Button>
            </div>
          </Card>

          {/* Voice Chat */}
          <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Voice Chat</span>
              <Button
                size="sm"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={voiceEnabled ? "bg-green-600" : "bg-gray-600"}
              >
                <Volume2 size={16} />
              </Button>
            </div>
            {voiceEnabled && (
              <Button
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className="w-full mt-2"
                variant="outline"
              >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
