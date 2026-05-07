import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Loader2, Copy, Check, Send, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [duelCode, setDuelCode] = useState<string>("");
  const [showDuelInput, setShowDuelInput] = useState(false);
  
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
  const { data: contentData } = trpc.content.getRandomVideos.useQuery(
    { category: selectedCategory, count: 1 },
    { enabled: gameStarted }
  ) as any;
  
  const createRoomMutation = trpc.game.createRoom.useMutation();
  const startGameMutation = trpc.game.finishGame.useMutation();
  const submitAnswerMutation = trpc.game.submitAnswer.useMutation();

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  // Timer effect
  useEffect(() => {
    if (!gameStarted || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShowAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameStarted, timeLeft]);

  // Create room on mount
  useEffect(() => {
    if (!roomId) {
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
              toast.success("遊戲房間已建立！");
            }
          },
          onError: (error) => {
            toast.error("建立房間失敗");
            navigate("/dashboard");
          },
        }
      );
    }
  }, []);

  useEffect(() => {
    if (gameStarted && gameStartTime === 0) {
      setGameStartTime(Date.now());
    }
  }, [gameStarted]);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("邀請碼已複製！");
    }
  };

  const handleStartGame = () => {
    if (gameType === "duel" && !duelCode.trim()) {
      toast.error("請輸入決鬥碼");
      return;
    }
    if (gameType === "random" && !selectedCategory) {
      toast.error("請選擇分類");
      return;
    }
    setGameStarted(true);
    setTimeLeft(30);
  };

  const handleSubmitAnswer = () => {
    if (!roomId || !answer.trim()) return;

    const time = Date.now() - gameStartTime;
    setResponseTime(time);

    submitAnswerMutation.mutate(
      {
        roomId,
        answer: answer.trim(),
        responseTime: time,
      },
      {
        onSuccess: (data) => {
          setIsCorrect(data.isCorrect);
          setScore((prev) => prev + data.score);
          setShowAnswer(true);
          
          if (data.isCorrect) {
            toast.success(`✅ 正確！獲得 ${data.score} 分`);
          } else {
            toast.error(`❌ 錯誤。正確答案是: ${contentData?.[0]?.title}`);
          }
        },
        onError: () => {
          toast.error("提交答案失敗");
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

  const currentContent = (contentData as any)?.data?.[0] || (contentData as any)?.[0];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/80 backdrop-blur-md border-b border-orange-500/20 sticky top-0 z-50"
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
            <span className="text-sm text-gray-400">
              {gameMode === "picture" ? "🖼️ 圖片模式" : "🎬 影片模式"}
            </span>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
            >
              返回
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main game area */}
          <div className="lg:col-span-2">
            {!gameStarted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Category Selection */}
                <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
                  <h2 className="text-xl font-bold mb-4 text-orange-400">選擇分類</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {categories?.data?.map((cat: any) => (
                      <Button
                        key={cat.id}
                        variant={selectedCategory === cat.id ? "default" : "outline"}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={selectedCategory === cat.id ? "bg-orange-500 text-black" : "border-orange-500/30"}
                        size="sm"
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </Card>

                {/* Game Mode Selection */}
                <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
                  <h2 className="text-xl font-bold mb-4 text-orange-400">選擇遊戲模式</h2>
                  <div className="space-y-2">
                    <Button
                      variant={gameType === "random" ? "default" : "outline"}
                      onClick={() => { setGameType("random"); setShowDuelInput(false); }}
                      className={gameType === "random" ? "w-full bg-orange-500 text-black" : "w-full border-orange-500/30"}
                    >
                      🎲 隨機配對
                    </Button>
                    <Button
                      variant={gameType === "bot" ? "default" : "outline"}
                      onClick={() => { setGameType("bot"); setShowDuelInput(false); }}
                      className={gameType === "bot" ? "w-full bg-orange-500 text-black" : "w-full border-orange-500/30"}
                    >
                      🤖 vs 機器人
                    </Button>
                    <Button
                      variant={gameType === "duel" ? "default" : "outline"}
                      onClick={() => { setGameType("duel"); setShowDuelInput(true); }}
                      className={gameType === "duel" ? "w-full bg-orange-500 text-black" : "w-full border-orange-500/30"}
                    >
                      ⚔️ 決鬥模式
                    </Button>
                  </div>

                  {showDuelInput && (
                    <div className="mt-4 flex gap-2">
                      <Input
                        placeholder="輸入決鬥碼"
                        value={duelCode}
                        onChange={(e) => setDuelCode(e.target.value)}
                        className="bg-black/50 border-orange-500/30"
                      />
                      <Button className="bg-orange-500 text-black">加入</Button>
                    </div>
                  )}
                </Card>

                {/* Start Button */}
                <Button
                  onClick={handleStartGame}
                  disabled={createRoomMutation.isPending || (gameType === "random" && !selectedCategory)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 text-lg"
                >
                  {createRoomMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      準備中...
                    </>
                  ) : (
                    "🎮 開始遊戲"
                  )}
                </Button>

                {/* Room Code Display */}
                {roomCode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-6 text-center"
                  >
                    <p className="text-gray-400 mb-4">房間碼</p>
                    <div className="flex items-center justify-center gap-4">
                      <div className="bg-black/50 border border-orange-500/30 rounded-lg px-6 py-4">
                        <p className="text-3xl font-bold text-orange-400 tracking-widest">
                          {roomCode}
                        </p>
                      </div>
                      <Button
                        onClick={handleCopyCode}
                        className="bg-orange-500 hover:bg-orange-600 text-black font-bold"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            已複製
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            複製
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Timer */}
                <div className="text-center">
                  <div className={`text-7xl font-bold ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-orange-400"}`}>
                    {timeLeft}s
                  </div>
                </div>

                {/* Content Display */}
                <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
                  {currentContent ? (
                    gameMode === "video" ? (
                      <iframe
                        src={(currentContent as any).url}
                        className="w-full h-96 rounded"
                        allowFullScreen
                      />
                    ) : (
                      <img
                        src={(currentContent as any).thumbnail || (currentContent as any).url}
                        alt="Game content"
                        className="w-full h-96 object-cover rounded"
                      />
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
                      placeholder="輸入您的答案..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSubmitAnswer()}
                      className="flex-1 bg-black/50 border-orange-500/30 text-white"
                      disabled={timeLeft === 0}
                    />
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={timeLeft === 0 || !answer.trim()}
                      className="bg-orange-500 hover:bg-orange-600 text-black font-bold"
                    >
                      提交
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
                        {isCorrect ? "✅ 正確！" : "❌ 錯誤"}
                      </p>
                      <p className="text-sm">
                        正確答案: <span className="font-bold text-orange-400">{(currentContent as any)?.title}</span>
                      </p>
                      <p className="text-sm mt-2">
                        您的答案: <span className="font-bold">{answer}</span>
                      </p>
                    </Card>

                    <div className="flex gap-2">
                      <Button onClick={handleNextRound} className="flex-1 bg-orange-500 text-black font-bold">
                        下一輪
                      </Button>
                      <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1 border-orange-500/30">
                        退出遊戲
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Score Display */}
                <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 text-center">
                  <p className="text-sm text-orange-300">得分</p>
                  <p className="text-4xl font-bold text-orange-400">{score}</p>
                  <p className="text-sm text-orange-300">第 {round} 輪</p>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Chat & Voice Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Chat Box */}
            <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 h-96 flex flex-col">
              <h3 className="font-bold text-orange-400 mb-2">💬 聊天</h3>
              <div className="flex-1 overflow-y-auto space-y-2 mb-2 bg-black/50 rounded p-2">
                {chatMessages.length === 0 ? (
                  <p className="text-gray-500 text-sm">暫無訊息</p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className="text-sm">
                      <span className="text-orange-400 font-bold">{msg.user}:</span>
                      <span className="text-white ml-1">{msg.message}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="輸入訊息..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                  className="bg-black/50 border-orange-500/30 text-white text-sm"
                />
                <Button
                  onClick={sendChatMessage}
                  size="sm"
                  className="bg-orange-500 text-black"
                >
                  <Send size={16} />
                </Button>
              </div>
            </Card>

            {/* Voice Chat */}
            <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
              <h3 className="font-bold text-orange-400 mb-2">🎙️ 語音聊天</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={voiceEnabled ? "flex-1 bg-green-500 text-black" : "flex-1 bg-gray-600"}
                >
                  {voiceEnabled ? "🟢 已連接" : "🔴 未連接"}
                </Button>
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  variant="outline"
                  size="sm"
                  className="border-orange-500/30"
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
