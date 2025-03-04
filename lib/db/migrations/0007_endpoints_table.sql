-- Create Endpoint table
CREATE TABLE `Endpoint` (
    `id` text PRIMARY KEY NOT NULL,
    `path` text NOT NULL,
    `parameters` text,
    `code` text NOT NULL,
    `httpMethod` text NOT NULL DEFAULT 'GET',
    `projectId` text NOT NULL,
    `userId` text NOT NULL,
    `createdAt` integer NOT NULL,
    FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`),
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
);

-- Create unique index on path
CREATE UNIQUE INDEX `Endpoint_path_unique` ON `Endpoint`(`path`);