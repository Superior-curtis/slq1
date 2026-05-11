import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { Loader2, Copy, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { useGameSocket } from "@/hooks/useGameSocket";

export default function GameRoom(props: any = {}) {
  const [location] = useLocation();
  const modeFromUrl = location.split("/").pop() || "picture";
  const gameMode = modeFromUrl === "picture" || modeFromUrl === "video" ? modeFromUrl : "picture";
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const queueStorageKey = "porn_guesser_queue_guest_id";

  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameType, setGameType] = useState<"random" | "bot" | "duel">("random");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [duelCode, setDuelCode] = useState<string>("");
  const [queueGuestId, setQueueGuestId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(queueStorageKey) || "";
  });
  const [isWaitingForMatch, setIsWaitingForMatch] = useState(false);

  const [answer, setAnswer] = useState("");
  const [responseTime, setResponseTime] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [contentVersion, setContentVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const startEmittedRoomIdRef = useRef<string | null>(null);

  const { isConnected, chatMessages, players, sendChatMessage, startGame, socket } = useGameSocket(
    roomId || undefined,
    user?.id != null ? String(user.id) : undefined,
    user?.name || undefined
  );

  // Ensure socket-side in-memory room exists and join once connected
  useEffect(() => {
    if (!roomId || !socket) return;
    const tryEnsureAndJoin = () => {
      try {
        socket.emit("ensureRoom", { roomId }, (res: any) => {
          console.log("ensureRoom ack", res);
          // after room ensured, emit join
          socket.emit("joinGameRoom", { roomId, username: user?.name || "Guest" }, (ack: any) => {
            console.log("joinGameRoom ack", ack);
          });
        });
      } catch (e) {
        console.warn("Failed to ensure/join room via socket", e);
      }
    };

    if (isConnected) {
      tryEnsureAndJoin();
    } else {
      const onConnect = () => {
        tryEnsureAndJoin();
        socket.off("connect", onConnect);
      };
      socket.on("connect", onConnect);
      return () => {
          socket.off("connect", onConnect);
      };
    }
  }, [roomId, socket, isConnected, user?.name]);

  const { data: categoriesData } = trpc.content.getCategories.useQuery();
  const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.data || []);
  const playableCategories = Array.from(new Set(categories.map((category: string) => category.trim()).filter(Boolean)));

  useEffect(() => {
    if (playableCategories.length === 0) return;

    const preferred = playableCategories.find((category: string) => category === "trending") ||
      playableCategories.find((category: string) => category === "discover videos") ||
      playableCategories[0];

    if (!selectedCategory || !playableCategories.includes(selectedCategory)) {
      setSelectedCategory(preferred);
    }
  }, [playableCategories, selectedCategory]);

  useEffect(() => {
    if (!gameStarted && gameType !== "duel") {
      setRoomId(null);
      setRoomCode(null);
    }
  }, [gameStarted, gameType]);

  const { data: contentData, refetch: refetchContent } = trpc.game.getContent.useQuery(
    { type: gameMode, category: selectedCategory || undefined },
    { enabled: gameStarted && !showAnswer, staleTime: 0 }
  );

  const createRoomMutation = trpc.game.createRoom.useMutation();
  const joinRoomByCodeMutation = trpc.game.joinRoomByCode.useMutation();
  const submitAnswerMutation = trpc.game.submitAnswer.useMutation();
  const joinQueueMutation = trpc.matchmaking.joinQueue.useMutation();
  const getQueueStatusQuery = trpc.matchmaking.getQueueStatus.useQuery(
    queueGuestId ? { guestId: queueGuestId } : undefined,
    {
      enabled: gameType === "random" && !gameStarted && !!queueGuestId,
      refetchInterval: isWaitingForMatch ? 2000 : false,
    }
  );

  const selectedCategoryLabel = selectedCategory || "Popular Mix";
  const currentContent = contentData as any | undefined;
  const contentHasResolved = contentData !== undefined;
  const getVideoEmbedId = (content: any) => {
    const directId = String(content?.sourceId || content?.id || "");
    if (directId && !directId.startsWith("mock_") && !directId.startsWith("sample_")) {
      return directId;
    }

    const sourceUrl = String(content?.sourceUrl || content?.url || "");
    const viewKeyMatch = sourceUrl.match(/[?&]viewkey=([^&]+)/i);
    if (viewKeyMatch?.[1]) return viewKeyMatch[1];

    const trailingMatch = sourceUrl.match(/\/([^/?#]+)(?:\?.*)?$/);
    if (trailingMatch?.[1]) return trailingMatch[1];

    return directId;
  };
  const correctAnswers = gameMode === "video"
    ? (currentContent?.actors && currentContent.actors.length > 0
      ? currentContent.actors
      : currentContent?.correctAnswers && currentContent.correctAnswers.length > 0
        ? currentContent.correctAnswers
        : ["Unknown"])
    : currentContent?.actors && currentContent.actors.length > 0
      ? currentContent.actors
      : currentContent?.correctAnswers && currentContent.correctAnswers.length > 0
        ? currentContent.correctAnswers
        : [currentContent?.title || "Unknown"];
  const currentVideoId = getVideoEmbedId(currentContent);
  const isPlaceholderMedia = (url?: string) => {
    if (!url) return false;
    return /via\.placeholder\.com|placeholder|sample_/i.test(url);
  };

  const currentImageUrl = !isPlaceholderMedia(currentContent?.thumbnail)
    ? currentContent?.thumbnail || ""
    : !isPlaceholderMedia(currentContent?.sourceUrl)
      ? currentContent?.sourceUrl || ""
      : "";

  useEffect(() => {
    if (!gameStarted || showAnswer) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimeout(() => handleSubmitAnswer(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, showAnswer, gameStartTime, roomId, answer]);

  useEffect(() => {
    if (gameStarted && !showAnswer && round > 0) {
      refetchContent();
    }
  }, [round, contentVersion, showAnswer, gameStarted, refetchContent]);

  useEffect(() => {
    if (!gameStarted || !roomId || !isConnected) return;
    if (startEmittedRoomIdRef.current === roomId) return;
    startEmittedRoomIdRef.current = roomId;
    startGame();
  }, [gameStarted, isConnected, roomId, startGame]);

  const resetRoundState = () => {
    setAnswer("");
    setResponseTime(0);
    setGameStartTime(Date.now());
    setTimeLeft(30);
    setShowAnswer(false);
    setIsCorrect(null);
    setRound(1);
    setContentVersion((prev) => prev + 1);
  };

  useEffect(() => {
    const matchedRoomId = getQueueStatusQuery.data?.matchedRoomId;
    if (!isWaitingForMatch || !matchedRoomId) return;

    setRoomId(matchedRoomId);
    setRoomCode(getQueueStatusQuery.data?.roomCode || matchedRoomId);
    setGameStarted(true);
    setIsWaitingForMatch(false);
    setTimeLeft(30);
    setGameStartTime(Date.now());
    toast.success("Match found! Starting the game.");
  }, [getQueueStatusQuery.data?.matchedRoomId, getQueueStatusQuery.data?.roomCode, isWaitingForMatch]);

  const handleSubmitAnswer = () => {
    if (!roomId) return;

    const time = Date.now() - gameStartTime;
    setResponseTime(time);

    submitAnswerMutation.mutate(
      { roomId, answer: answer.trim() || "(No answer)", responseTime: time },
      {
        onSuccess: (data) => {
          setIsCorrect(data.isCorrect);
          setScore((prev) => prev + data.score);
          setShowAnswer(true);

          if (data.isCorrect) {
            toast.success(`✅ Correct! +${data.score} points`);
          } else {
            toast.error("❌ Wrong answer. Try the next round.");
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
    setContentVersion((prev) => prev + 1);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput("");
  };

  const openRoom = async (roomType: "random" | "bot" | "duel") => {
    const createdRoom = await createRoomMutation.mutateAsync({
      gameMode: gameMode as "picture" | "video",
      roomType,
      category: selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
    });

    setRoomId(createdRoom.id);
    setRoomCode(createdRoom.roomCode);
    // Ensure the server's in-memory socket room exists so players can join immediately
    try {
      if (socket && typeof socket.emit === "function") {
        socket.emit("ensureRoom", { roomId: createdRoom.id });
      }
    } catch (e) {
      console.warn("Failed to emit ensureRoom", e);
    }
    resetRoundState();
    return createdRoom;
  };

  const handlePrimaryAction = async () => {
    try {
      if (gameType === "duel" && duelCode.trim()) {
        const room = await joinRoomByCodeMutation.mutateAsync({ roomCode: duelCode.trim().toUpperCase() });
        setRoomId(room.id);
        setRoomCode(room.roomCode);
        setGameStarted(false);
        setGameType("duel");
        resetRoundState();
        toast.success(`Joined duel room ${room.roomCode}`);
        return;
      }

      if (gameType === "duel") {
        const room = await openRoom(gameType);
        setGameStarted(false);
        setGameType("duel");
        toast.success(`Duel room created: ${room.roomCode}. Share the code with the other player.`);
        return;
      }

      if (gameType === "random") {
        const response = await joinQueueMutation.mutateAsync({
          gameMode: gameMode as "picture" | "video",
          guestId: queueGuestId || undefined,
        });

        if (response.guestId && !queueGuestId) {
          setQueueGuestId(response.guestId);
          window.localStorage.setItem(queueStorageKey, response.guestId);
        }

        if (response.matchedRoomId) {
          setRoomId(response.matchedRoomId);
          setRoomCode(response.roomCode || response.matchedRoomId);
          setGameStarted(true);
          resetRoundState();
          toast.success(`Matched! Room ${response.roomCode || response.matchedRoomId}`);
        } else {
          setIsWaitingForMatch(true);
          setGameStarted(false);
          toast.info("Joined queue. Waiting for another player...");
        }

        return;
      }

      const room = await openRoom(gameType);
      setGameStarted(true);
      resetRoundState();
      toast.success(`Room ready: ${room.roomCode}`);
    } catch {
      toast.error(gameType === "random" ? "Failed to join queue" : "Failed to create room");
      setGameStarted(false);
    }
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const duelReadyToStart = gameType !== "duel" || !roomCode || players.length >= 2;

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
      <div className="bg-gradient-to-r from-orange-500/20 to-orange-500/5 border-b border-orange-500/30 p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">
              {gameMode === "video" ? "🎬 Video Trivia" : "🖼️ Picture Trivia"}
            </h1>
            <p className="text-sm text-orange-300">
              Mode: {gameType === "random" ? "🎲 Random Match" : gameType === "bot" ? "🤖 vs Bot" : "⚔️ Duel"}
              {isConnected && <span className="ml-2 text-green-400">● Connected</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/lobby")} variant="outline" className="border-orange-500/30">Lobby</Button>
            <Button onClick={() => navigate("/leaderboard")} variant="outline" className="border-orange-500/30">Leaderboard</Button>
            <Button onClick={() => navigate("/profile")} variant="outline" className="border-orange-500/30">Profile</Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="border-orange-500/30">Back</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {!gameStarted ? (
            <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30">
              <h2 className="text-lg font-bold mb-4">Select Game Mode</h2>

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

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Select Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 bg-black/50 border border-orange-500/30 rounded text-white"
                >
                  <option value="">Popular Mix</option>
                  {playableCategories.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {gameType === "duel" && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Duel Room Code</label>
                  <Input
                    placeholder="Enter a duel code to join or leave empty to create one"
                    value={duelCode}
                    onChange={(e) => setDuelCode(e.target.value)}
                    className="bg-black/50 border-orange-500/30 text-white"
                  />
                </div>
              )}

              <Button
                onClick={() => {
                  if (gameType === "duel" && roomCode && !gameStarted) {
                    if (!duelReadyToStart) {
                      toast.info("Waiting for both players to join the duel room.");
                      return;
                    }
                    setGameStarted(true);
                  } else {
                    handlePrimaryAction();
                  }
                }}
                disabled={joinQueueMutation.isPending || createRoomMutation.isPending || joinRoomByCodeMutation.isPending || (!duelReadyToStart && gameType === "duel" && !!roomCode && !gameStarted)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold disabled:opacity-50"
              >
                {gameType === "random" && joinQueueMutation.isPending ? (
                  <>
                    <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                    Joining Queue...
                  </>
                ) : gameType === "random" ? (
                  "Find Match"
                ) : (
                  "Start Game"
                )}
              </Button>

              {gameType === "random" && (getQueueStatusQuery.data || isWaitingForMatch) && (
                <Card className="p-4 bg-blue-900/30 border border-blue-500/30 text-center mt-4">
                  <p className="text-sm text-blue-300">
                    Queue Position: {getQueueStatusQuery.data?.queuePosition ?? 0}/{getQueueStatusQuery.data?.queueSize ?? 0}
                  </p>
                  <p className="text-xs text-blue-400 mt-2">Est. Wait: {getQueueStatusQuery.data?.estimatedWaitTime ?? 0}s</p>
                </Card>
              )}

              {gameType === "duel" && roomCode && !gameStarted && (
                <>
                  <Card className="p-4 bg-blue-900/30 border border-blue-500/30 text-center mt-4">
                    <p className="text-sm text-blue-300">Duel Room Code</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="text-2xl font-bold tracking-[0.2em] text-blue-200">{roomCode}</span>
                      <Button onClick={copyRoomCode} size="sm" variant="outline" className="border-blue-400/40 text-blue-100">
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="text-xs text-blue-400 mt-2">Share this code so the other player can join the duel.</p>
                    <p className="text-xs text-blue-300 mt-1">Players ready: {players.length}/2</p>
                  </Card>
                  <Card className="p-4 bg-black/40 border border-orange-500/20 text-center mt-4">
                    <p className="text-sm text-orange-300">Waiting for opponent</p>
                    <p className="text-xs text-orange-400 mt-2">Keep this page open and share the room code above.</p>
                  </Card>
                </>
              )}

              {gameType === "random" && isWaitingForMatch && (
                <Card className="p-4 bg-black/40 border border-orange-500/20 text-center mt-4">
                  <p className="text-sm text-orange-300">Waiting for another player</p>
                </Card>
              )}
            </Card>
          ) : null}

          {gameStarted ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {gameMode !== "video" ? (
                <Card className="p-4 bg-black/40 border border-orange-500/20">
                  <p className="text-xs text-orange-300 uppercase tracking-[0.2em]">Current Category</p>
                  <p className="text-lg font-semibold text-white">{selectedCategoryLabel}</p>
                </Card>
              ) : (
                <Card className="p-4 bg-black/40 border border-orange-500/20">
                  <p className="text-xs text-orange-300 uppercase tracking-[0.2em]">Topic</p>
                  <p className="text-lg font-semibold text-white">Hidden until the round ends</p>
                </Card>
              )}

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

              <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 min-h-96">
                {currentContent ? (
                  gameMode === "video" ? (
                    <div className="w-full aspect-video bg-black rounded overflow-hidden">
                      {currentVideoId ? (
                            <div className="relative w-full h-full">
                              <iframe
                                src={`https://www.pornhub.com/embed/${currentVideoId}${soundEnabled ? "" : "?mute=1"}`}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allow={soundEnabled ? "autoplay; encrypted-media" : "encrypted-media"}
                                allowFullScreen
                                style={{ border: "none" }}
                                title="Pornhub Video"
                                onError={() => toast.error("Video failed to load. Try next round.")}
                              />
                              <div className="absolute right-3 top-3">
                                <Button
                                  onClick={() => setSoundEnabled((prev) => !prev)}
                                  size="sm"
                                  variant="secondary"
                                  className="bg-black/70 text-white border border-white/10"
                                >
                                  {soundEnabled ? "Sound on" : "Sound off"}
                                </Button>
                              </div>
                            </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/50">
                          <p className="text-orange-300">Video unavailable</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-96 bg-black rounded overflow-hidden flex items-center justify-center">
                      {currentImageUrl ? (
                        <img
                          src={currentImageUrl}
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
                ) : contentHasResolved ? (
                  <div className="w-full h-96 flex items-center justify-center text-center px-6">
                    <div className="space-y-2">
                      <p className="text-orange-300 font-semibold">No real Pornhub content available right now.</p>
                      <p className="text-sm text-orange-400">The scraper returned nothing for this category. Try another category or refresh later.</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-96 flex items-center justify-center">
                    <Loader2 className="animate-spin text-orange-400" size={48} />
                  </div>
                )}
              </Card>

              {!showAnswer ? (
                <div className="flex gap-2">
                  <Input
                    placeholder={gameMode === "video" ? "Enter actor name..." : "Enter your answer (actor name or title)..."}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
                    className="flex-1 bg-black/50 border-orange-500/30 text-white"
                    disabled={timeLeft === 0}
                  />
                  <Button onClick={handleSubmitAnswer} disabled={timeLeft === 0} className="bg-orange-500 hover:bg-orange-600 text-black font-bold">
                    Submit
                  </Button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <Card className={`p-6 ${isCorrect ? "bg-green-900/30 border-green-500/30" : "bg-red-900/30 border-red-500/30"}`}>
                    <p className="text-lg font-bold mb-2">{isCorrect ? "✅ Correct!" : "❌ Wrong"}</p>
                    <p className="text-sm">
                      {gameMode === "video" ? "Correct Actor(s):" : "Correct Answer(s):"} <span className="font-bold text-orange-400">{correctAnswers.length > 0 ? correctAnswers.join(" / ") : "Unknown"}</span>
                    </p>
                    <p className="text-sm mt-2">
                      Your answer: <span className="font-bold">{answer || "(No answer)"}</span>
                    </p>
                    <p className="text-sm mt-2">
                      Response time: <span className="font-bold">{(responseTime / 1000).toFixed(1)}s</span>
                    </p>
                  </Card>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSoundEnabled(true);
                        handleNextRound();
                      }}
                      className="flex-1 bg-orange-500 text-black font-bold"
                    >
                      Next Round
                    </Button>
                    <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1 border-orange-500/30">Exit Game</Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : null}
        </div>

        <div className="space-y-4">
          {roomCode && (
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30">
              <p className="text-sm text-blue-300 mb-2">Room Code:</p>
              <div className="flex gap-2">
                <Input value={roomCode} readOnly className="bg-black/50 border-blue-500/30 text-white text-sm" />
                <Button onClick={copyRoomCode} size="sm" className="bg-blue-500 hover:bg-blue-600">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-4 bg-black/40 border border-orange-500/20">
            <h3 className="font-semibold mb-3">Players</h3>
            <div className="space-y-2">
              {players.length > 0 ? players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 rounded bg-orange-500/5 border border-orange-500/10">
                  <span>{player.name}</span>
                  <span className="text-orange-400">{player.score}</span>
                </div>
              )) : (
                <p className="text-sm text-orange-300">Waiting for players...</p>
              )}
            </div>
          </Card>

          <Card className="p-4 bg-black/40 border border-orange-500/20">
            <h3 className="font-semibold mb-3">Chat</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
              {chatMessages.length > 0 ? chatMessages.map((msg, index) => (
                <div key={index} className="text-sm p-2 rounded bg-orange-500/5 border border-orange-500/10">
                  <span className="text-orange-400 font-semibold">{msg.userName}: </span>
                  <span>{msg.message}</span>
                </div>
              )) : (
                <p className="text-sm text-orange-300">No messages yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                className="bg-black/50 border-orange-500/30 text-white"
              />
              <Button onClick={handleSendChat} className="bg-orange-500 hover:bg-orange-600 text-black">
                <Send size={16} />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
