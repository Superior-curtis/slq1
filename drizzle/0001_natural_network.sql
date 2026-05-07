CREATE TABLE `contentCache` (
	`id` varchar(64) NOT NULL,
	`contentType` enum('picture','video') NOT NULL,
	`sourceId` varchar(255) NOT NULL,
	`sourceUrl` text NOT NULL,
	`title` varchar(255),
	`actors` json NOT NULL DEFAULT ('[]'),
	`categories` json NOT NULL DEFAULT ('[]'),
	`correctAnswers` json NOT NULL DEFAULT ('[]'),
	`cachedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `contentCache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gameHistory` (
	`id` varchar(64) NOT NULL,
	`roomId` varchar(64) NOT NULL,
	`playerId` int NOT NULL,
	`opponentIds` json NOT NULL DEFAULT ('[]'),
	`gameMode` enum('picture','video') NOT NULL,
	`roomType` enum('random','duel') NOT NULL,
	`score` int NOT NULL,
	`rank` int NOT NULL,
	`correctAnswers` int NOT NULL,
	`totalAnswers` int NOT NULL,
	`averageResponseTime` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gameHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gameRooms` (
	`id` varchar(64) NOT NULL,
	`roomCode` varchar(12) NOT NULL,
	`roomType` enum('random','duel') NOT NULL,
	`gameMode` enum('picture','video') NOT NULL,
	`creatorId` int NOT NULL,
	`playerIds` json NOT NULL DEFAULT ('[]'),
	`maxPlayers` int NOT NULL DEFAULT 2,
	`status` enum('waiting','active','finished') NOT NULL DEFAULT 'waiting',
	`currentRound` int NOT NULL DEFAULT 0,
	`totalRounds` int NOT NULL DEFAULT 5,
	`currentContent` json,
	`playerScores` json NOT NULL DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`finishedAt` timestamp,
	CONSTRAINT `gameRooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `gameRooms_roomCode_unique` UNIQUE(`roomCode`)
);
--> statement-breakpoint
CREATE TABLE `leaderboard` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rank` int NOT NULL,
	`totalScore` int NOT NULL,
	`gamesPlayed` int NOT NULL,
	`gamesWon` int NOT NULL,
	`winRate` decimal(5,2) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaderboard_id` PRIMARY KEY(`id`),
	CONSTRAINT `leaderboard_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`type` enum('game_invite','game_started','game_finished','rank_change','new_challenge','opponent_joined') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`relatedRoomId` varchar(64),
	`relatedUserId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerConnections` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`socketId` varchar(255) NOT NULL,
	`isConnected` boolean NOT NULL DEFAULT true,
	`currentRoomId` varchar(64),
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playerConnections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `totalScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `gamesPlayed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `gamesWon` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `correctAnswers` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totalAnswers` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `averageResponseTime` decimal(10,2) DEFAULT '0';--> statement-breakpoint
CREATE INDEX `sourceIdx` ON `contentCache` (`sourceId`);--> statement-breakpoint
CREATE INDEX `contentTypeIdx` ON `contentCache` (`contentType`);--> statement-breakpoint
CREATE INDEX `playerIdx` ON `gameHistory` (`playerId`);--> statement-breakpoint
CREATE INDEX `createdAtIdx` ON `gameHistory` (`createdAt`);--> statement-breakpoint
CREATE INDEX `statusIdx` ON `gameRooms` (`status`);--> statement-breakpoint
CREATE INDEX `creatorIdx` ON `gameRooms` (`creatorId`);--> statement-breakpoint
CREATE INDEX `createdAtIdx` ON `gameRooms` (`createdAt`);--> statement-breakpoint
CREATE INDEX `rankIdx` ON `leaderboard` (`rank`);--> statement-breakpoint
CREATE INDEX `userIdx` ON `leaderboard` (`userId`);--> statement-breakpoint
CREATE INDEX `userIdx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `isReadIdx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `createdAtIdx` ON `notifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `userIdx` ON `playerConnections` (`userId`);--> statement-breakpoint
CREATE INDEX `connectedIdx` ON `playerConnections` (`isConnected`);--> statement-breakpoint
CREATE INDEX `scoreIdx` ON `users` (`totalScore`);--> statement-breakpoint
CREATE INDEX `createdAtIdx` ON `users` (`createdAt`);