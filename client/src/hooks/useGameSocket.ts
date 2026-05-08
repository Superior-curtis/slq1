import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

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

export function useGameSocket(roomId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameRoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [players, setPlayers] = useState<Array<{ id: string; name: string; score: number }>>([]);

  useEffect(() => {
    // 連接到 Socket.IO 伺服器
    const socket = io(window.location.origin, {
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
        socket.emit("joinGameRoom", { roomId });
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
  }, [roomId]);

  const sendChatMessage = (message: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("chatMessage", { message });
    }
  };

  const submitAnswer = (answer: string, responseTime: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("submitAnswer", { answer, responseTime });
    }
  };

  const startGame = () => {
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
