import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Loader2, Copy, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { useGameSocket } from "@/hooks/useGameSocket";

export default function GameRoom(props: any = {}) {
  const [location] = useLocation();
  const modeFromUrl = location.split("/").pop() || "picture";
  const gameMode = modeFromUrl === "picture" || modeFromUrl === "video" ? modeFromUrl : "picture";
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

  // Socket.IO
  const { isConnected, chatMessages, players, sendChatMessage } = useGameSocket(roomId || undefined);
  const [chatInput, setChatInput] = useState("");

  // API queries
  const { data: categoriesData } = trpc.content.getCategories.useQuery();
  const categories = categoriesData?.data || [];

  const { data: contentData, refetch: refetchContent } = trpc.content.getRandomVideos.useQuery(
    { category: selectedCategory || "all", count: 1 },
    { enabled: gameStarted && showAnswer === false, staleTime: 0 }
  );

  const createRoomMutation = trpc.game.createRoom.useMutation();
  const submitAnswerMutation = trpc.game.submitAnswer.useMutation();

  // Timer effect
  useEffect(() => {
    if (!gameStarted || showAnswer) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
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

  // Refetch content when round changes
  useEffect(() => {
    if (gameStarted && !showAnswer && round > 0) {
      refetchContent();
    }
  }, [round, showAnswer, gameStarted, refetchContent]);

  // Create room on mount
  useEffect(() => {
    if (!roomId && isAuthenticated && gameStarted) {
      const newRoomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      setRoomId(newRoomId);

      createRoomMutation.mutate(
        {
          gameMode: (gameMode as "picture" | "video"),
          roomType: (gameType as "random" | "bot" | "duel"),
          category: selectedCategory !== "all" ? selectedCategory : undefined,
        },
        {
          onSuccess: (data) => {
            if (data) {
              setRoomCode(data.roomCode);
              setGameStartTime(Date.now());
              toast.success("Game room created!");
            }
          },
          onError: (error) => {
            toast.error("Failed to create room");
            setGameStarted(false);
          },
        }
      );
    }
  }, [gameStarted, isAuthenticated]);

  const handleSubmitAnswer = () => {
    if (!roomId) return;

    const time = Date.now() - gameStartTime;
    setResponseTime(time);

    const currentContent = contentData?.data?.[0];
    const correctAnswers = currentContent?.actors && currentContent.actors.length > 0 
      ? currentContent.actors 
      : [currentContent?.title || "Unknown"];

    const isAnswerCorrect = correctAnswers.some(
      (correct: string) => correct.toLowerCase().trim() === answer.toLowerCase().trim()
    );

    submitAnswerMutation.mutate(
      {
        roomId,
        answer: answer.trim() || "(No answer)",
        responseTime: time,
      },
      {
        onSuccess: (data) => {
          setIsCorrect(isAnswerCorrect);
          setScore((prev) => prev + (isAnswerCorrect ? 100 : 0));
          setShowAnswer(true);

          if (isAnswerCorrect) {
            toast.success(`✅ Correct! +100 points`);
          } else {
            toast.error(`❌ Wrong. Answer: ${correctAnswers.join(" / ")}`);
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

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput("");
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentContent = contentData?.data?.[0];
  const correctAnswers = currentContent?.actors && currentContent.actors.length > 0
    ? currentContent.actors
    : [currentContent?.title || "Unknown"];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-400 mb-4">Access Denied</h1>
          <p className="text-orange-300 mb-6">Please log in to play</p>
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
      <div className="bg-gradient-to-r from-orange-500/20 to-orange-500/5 border-b border-orange-500/30 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">
              {gameMode === "video" ? "🎬 Video Trivia" : "🖼️ Picture Trivia"}
            </h1>
            <p className="text-sm text-orange-300">
              Mode: {gameType === "random" ? "🎲 Random Match" : gameType === "bot" ? "🤖 vs Bot" : "⚔️ Duel"}
              {isConnected && <span className="ml-2 text-green-400">● Connected</span>}
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
          {!gameStarted ? (
            <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
              <h2 className="text-lg font-bold mb-4">Select Game Mode</h2>

              {/* Game Type */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Game Type</label>
                <div className="grid grid-cols-3 gap-2">
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
                  {categories.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
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

              <Button
                onClick={() => setGameStarted(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold"
              >
                Start Game
              </Button>
            </Card>
          ) : null}

          {/* Game Content */}
          {gameStarted ? (
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
              <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 min-h-96">
                {currentContent ? (
                  gameMode === "video" ? (
                    <div className="w-full aspect-video bg-black rounded overflow-hidden">
                      {currentContent.id ? (
                        <iframe
                          src={`https://www.pornhub.com/embed/${currentContent.id}`}
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          style={{ border: "none" }}
                          onError={() => {
                            toast.error("Video failed to load. Try next round.");
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/50">
                          <p className="text-orange-300">Video ID not available</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-96 bg-black rounded overflow-hidden flex items-center justify-center">
                      {currentContent.thumbnail ? (
                        <img
                          src={currentContent.thumbnail}
                          alt="Content"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23333' width='400' height='300'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='16'%3EImage unavailable%3C/text%3E%3C/svg%3E";
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
                    placeholder="Enter your answer (actor name or title)..."
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
                    <p className="text-lg font-bold mb-2">{isCorrect ? "✅ Correct!" : "❌ Wrong"}</p>
                    <p className="text-sm">
                      Correct Answer(s): <span className="font-bold text-orange-400">{correctAnswers.join(" / ")}</span>
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
          ) : null}
        </div>

        {/* Chat & Room Info Section */}
        <div className="space-y-4">
          {/* Room Code */}
          {roomCode && (
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30">
              <p className="text-sm text-blue-300 mb-2">Room Code:</p>
              <div className="flex gap-2">
                <Input value={roomCode} readOnly className="bg-black/50 border-blue-500/30 text-white text-sm" />
                <Button
                  onClick={copyRoomCode}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </Card>
          )}

          {/* Players */}
          {players.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30">
              <p className="text-sm font-bold text-purple-300 mb-2">Players ({players.length})</p>
              <div className="space-y-1">
                {players.map((player) => (
                  <div key={player.id} className="flex justify-between text-sm">
                    <span className="text-gray-300">{player.name}</span>
                    <span className="text-purple-400 font-bold">{player.score} pts</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Chat */}
          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30 h-96 flex flex-col">
            <h3 className="font-bold mb-3 text-orange-400">Room Chat</h3>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 text-sm">
              {chatMessages.length === 0 ? (
                <p className="text-gray-500">No messages yet</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="break-words">
                    <span className="font-bold text-orange-400">{msg.userName}:</span>
                    <span className="text-gray-300 ml-2">{msg.message}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                className="flex-1 bg-black/50 border-orange-500/30 text-white text-sm"
              />
              <Button onClick={handleSendChat} size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Send size={16} />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
