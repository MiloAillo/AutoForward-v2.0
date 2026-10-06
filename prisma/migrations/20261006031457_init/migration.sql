-- CreateTable
CREATE TABLE `ForwardItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listenId` VARCHAR(191) NOT NULL,
    `sendId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ForwardItem_listenId_sendId_key`(`listenId`, `sendId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `forwardItemId` INTEGER NOT NULL,
    `msg` JSON NOT NULL,
    `datetime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mediaPath` VARCHAR(191) NULL,
    `isSent` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Chat_forwardItemId_datetime_idx`(`forwardItemId`, `datetime`),
    INDEX `Chat_isSent_datetime_idx`(`isSent`, `datetime`),
    INDEX `Chat_datetime_idx`(`datetime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SendRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `rule` TEXT NOT NULL,

    INDEX `SendRule_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ForwardItemToSendRule` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ForwardItemToSendRule_AB_unique`(`A`, `B`),
    INDEX `_ForwardItemToSendRule_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Chat` ADD CONSTRAINT `Chat_forwardItemId_fkey` FOREIGN KEY (`forwardItemId`) REFERENCES `ForwardItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ForwardItemToSendRule` ADD CONSTRAINT `_ForwardItemToSendRule_A_fkey` FOREIGN KEY (`A`) REFERENCES `ForwardItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ForwardItemToSendRule` ADD CONSTRAINT `_ForwardItemToSendRule_B_fkey` FOREIGN KEY (`B`) REFERENCES `SendRule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
