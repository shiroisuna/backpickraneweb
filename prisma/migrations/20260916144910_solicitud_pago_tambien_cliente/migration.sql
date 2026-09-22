-- DropForeignKey
ALTER TABLE `solicitudpago` DROP FOREIGN KEY `SolicitudPago_grueroPerfilId_fkey`;

-- DropIndex
DROP INDEX `SolicitudPago_grueroPerfilId_fkey` ON `solicitudpago`;

-- AlterTable
ALTER TABLE `solicitudpago` ADD COLUMN `clienteId` VARCHAR(191) NULL,
    MODIFY `grueroPerfilId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `SolicitudPago` ADD CONSTRAINT `SolicitudPago_grueroPerfilId_fkey` FOREIGN KEY (`grueroPerfilId`) REFERENCES `GrueroPerfil`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitudPago` ADD CONSTRAINT `SolicitudPago_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
