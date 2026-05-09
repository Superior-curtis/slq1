import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { BACKEND_URL, ZERO_CARD_MODE } from "@/lib/zeroCard";

interface GameRoomState {
  roomId: string;
  players: Array<{ id: string; name: string; score: number }>;
  currentRound: number;
  gameStarted: boolean;
  timeLeft: number;
}

interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

export function useGameSocket(roomId?: string, userName?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameRoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [players, setPlayers] = useState<Array<{ id: string; name: string; score: number }>>([]);

  useEffect(() => {
    if (ZERO_CARD_MODE) {
      const roomPlayers = [
        { id: "local-player", name: "Local Player", score: 0 },
        { id: "demo-opponent", name: "Demo Opponent", score: 0 },
      ];

      setIsConnected(true);
      setPlayers(roomPlayers);
      setGameState({
        roomId: roomId || "local-room",
        players: roomPlayers,
        currentRound: 1,
        gameStarted: false,
        timeLeft: 30,
      });
      setChatMessages([
        {
          userId: "system",
          userName: "System",
          message: "Zero-card mode is running locally.",
          timestamp: Date.now(),
        },
      ]);

      return;
    }

    // 連接到 Socket.IO 伺服器
    const socket = io(BACKEND_URL || window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.IO] Connected");
      setIsConnected(true);

      // 如果有 roomId，加入房間
      if (roomId) {
        socket.emit("joinGameRoom", { roomId, userName });
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket.IO] Disconnected");
      setIsConnected(false);
    });

    // 遊戲狀態更新
    socket.on("gameStateUpdate", (state: GameRoomState) => {
      setGameState(state);
      setPlayers(state.players);
    });

    // 聊天消息
    socket.on("chatMessage", (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // 玩家加入
    socket.on("playerJoined", (player: { id: string; name: string }) => {
      console.log("[Socket.IO] Player joined:", player);
      setPlayers((prev) => [...prev, { ...player, score: 0 }]);
    });

    // 玩家離開
    socket.on("playerLeft", (playerId: string) => {
      console.log("[Socket.IO] Player left:", playerId);
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    });

    // 遊戲開始
    socket.on("gameStart", (data: any) => {
      console.log("[Socket.IO] Game started:", data);
      setGameState((prev) => (prev ? { ...prev, gameStarted: true } : null));
    });

    // 遊戲結束
    socket.on("gameEnd", (data: any) => {
      console.log("[Socket.IO] Game ended:", data);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userName]);

  const sendChatMessage = (message: string) => {
    if (ZERO_CARD_MODE) {
      setChatMessages((prev) => [
        ...prev,
        {
          userId: "local-player",
          userName: "Local Player",
          message,
          timestamp: Date.now(),
        },
      ]);

      return;
    }

    if (socketRef.current && isConnected) {
      socketRef.current.emit("chatMessage", { message });
    }
  };

  const submitAnswer = (answer: string, responseTime: number) => {
    if (ZERO_CARD_MODE) {
      return;
    }

    if (socketRef.current && isConnected) {
      socketRef.current.emit("submitAnswer", { answer, responseTime });
    }
  };

  const startGame = () => {
    if (ZERO_CARD_MODE) {
      setGameState((prev) => (prev ? { ...prev, gameStarted: true } : prev));
      return;
    }

    if (socketRef.current && isConnected) {
      socketRef.current.emit("startGame");
    }
  };

  return {
    isConnected,
    gameState,
    chatMessages,
    players,
    sendChatMessage,
    submitAnswer,
    startGame,
    socket: socketRef.current,
  };
}
