import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function GameRoom(props: any = {}) {
  const gameMode = props.gameMode || "picture";
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [answer, setAnswer] = useState("");
  const [responseTime, setResponseTime] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [copied, setCopied] = useState(false);

  const createRoomMutation = trpc.game.createRoom.useMutation();
  const startGameMutation = trpc.game.finishGame.useMutation();
  const submitAnswerMutation = trpc.game.submitAnswer.useMutation();
  const getContentQuery = trpc.game.getContent.useQuery({
    type: gameMode,
  });

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  useEffect(() => {
    // Create room on mount
    if (!roomId) {
      createRoomMutation.mutate(
        {
          gameMode: gameMode as "picture" | "video",
          roomType: "random" as const,
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
    if (roomId) {
      startGameMutation.mutate(
        { roomId },
        {
          onSuccess: () => {
            setGameStarted(true);
            toast.success("遊戲開始！");
          },
          onError: () => {
            toast.error("開始遊戲失敗");
          },
        }
      );
    }
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
          if (data.isCorrect) {
            toast.success(`✅ 正確！獲得 ${data.score} 分`);
          } else {
            toast.error(`❌ 錯誤。請重新嘗試。`);
          }
          setAnswer("");
          setGameStartTime(Date.now());
        },
        onError: () => {
          toast.error("提交答案失敗");
        },
      }
    );
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
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {!gameStarted ? (
            // Waiting room
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-6">等待遊戲開始</h2>

              {roomCode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8"
                >
                  <p className="text-gray-400 mb-4">邀請碼</p>
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

              <p className="text-gray-400 mb-8">
                分享邀請碼給朋友，或點擊下方開始遊戲
              </p>

              <Button
                onClick={handleStartGame}
                disabled={createRoomMutation.isPending || startGameMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600 text-black font-bold px-8 py-6 text-lg"
              >
                {startGameMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    開始中...
                  </>
                ) : (
                  "開始遊戲"
                )}
              </Button>
            </div>
          ) : (
            // Game interface
            <div className="space-y-8">
              {/* Content display */}
              {getContentQuery.isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : getContentQuery.data ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-8"
                >
                  {gameMode === "picture" ? (
                    <img
                      src={(getContentQuery.data as any)?.link || "https://via.placeholder.com/400x300?text=Picture+Mode"}
                      alt="Game content"
                      className="w-full h-96 object-cover rounded-lg mb-6"
                    />
                  ) : (
                    <video
                      src={(getContentQuery.data as any)?.link || "https://via.placeholder.com/400x300?text=Video+Mode"}
                      controls
                      className="w-full h-96 rounded-lg mb-6"
                    />
                  )}

                  <div className="text-center">
                    <p className="text-gray-400 mb-4">
                      {gameMode === "picture"
                        ? "猜測這部影片的演員或片名"
                        : "觀看影片片段，猜測相關資訊"}
                    </p>
                    <p className="text-sm text-orange-400">
                      反應時間: {(responseTime / 1000).toFixed(1)}s
                    </p>
                  </div>
                </motion.div>
              ) : null}

              {/* Answer input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-lg p-6"
              >
                <label className="block text-sm font-bold mb-4">您的答案</label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSubmitAnswer()}
                    placeholder="輸入您的答案..."
                    className="flex-1 bg-black/50 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim() || submitAnswerMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-600 text-black font-bold px-6"
                  >
                    {submitAnswerMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "提交"
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
