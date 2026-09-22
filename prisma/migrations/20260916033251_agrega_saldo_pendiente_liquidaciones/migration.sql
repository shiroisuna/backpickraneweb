-- AlterTable
ALTER TABLE `grueroperfil` ADD COLUMN `saldoPendientePago` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `Liquidacion` (
    `id` VARCHAR(191) NOT NULL,
    `grueroPerfilId` VARCHAR(191) NOT NULL,
    `monto` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Liquidacion` ADD CONSTRAINT `Liquidacion_grueroPerfilId_fkey` FOREIGN KEY (`grueroPerfilId`) REFERENCES `GrueroPerfil`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
