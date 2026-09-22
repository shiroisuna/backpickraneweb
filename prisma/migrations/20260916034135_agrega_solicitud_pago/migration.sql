/*
  Warnings:

  - You are about to drop the `liquidacion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `liquidacion` DROP FOREIGN KEY `Liquidacion_grueroPerfilId_fkey`;

-- DropTable
DROP TABLE `liquidacion`;

-- CreateTable
CREATE TABLE `SolicitudPago` (
    `id` VARCHAR(191) NOT NULL,
    `grueroPerfilId` VARCHAR(191) NOT NULL,
    `monto` DOUBLE NOT NULL,
    `banco` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `cedulaORif` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `pagadoEn` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SolicitudPago` ADD CONSTRAINT `SolicitudPago_grueroPerfilId_fkey` FOREIGN KEY (`grueroPerfilId`) REFERENCES `GrueroPerfil`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
