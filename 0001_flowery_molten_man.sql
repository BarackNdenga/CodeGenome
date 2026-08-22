CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`projectName` varchar(255) NOT NULL,
	`sourceType` varchar(50) NOT NULL,
	`sourceUrl` text,
	`storageKey` text,
	`genomeScore` json NOT NULL,
	`metrics` json NOT NULL,
	`modules` json NOT NULL,
	`dependencies` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
