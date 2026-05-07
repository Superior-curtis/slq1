ALTER TABLE `contentCache` MODIFY COLUMN `actors` json NOT NULL DEFAULT json_array();--> statement-breakpoint
ALTER TABLE `contentCache` MODIFY COLUMN `categories` json NOT NULL DEFAULT json_array();--> statement-breakpoint
ALTER TABLE `contentCache` MODIFY COLUMN `correctAnswers` json NOT NULL DEFAULT json_array();--> statement-breakpoint
ALTER TABLE `gameHistory` MODIFY COLUMN `opponentIds` json NOT NULL DEFAULT json_array();--> statement-breakpoint
ALTER TABLE `gameRooms` MODIFY COLUMN `playerIds` json NOT NULL DEFAULT json_array();--> statement-breakpoint
ALTER TABLE `gameRooms` MODIFY COLUMN `playerScores` json NOT NULL DEFAULT json_object();