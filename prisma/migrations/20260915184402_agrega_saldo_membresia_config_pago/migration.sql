-- AlterTable
ALTER TABLE `pago` MODIFY `metodo` ENUM('EFECTIVO', 'PAGO_MOVIL', 'SALDO') NOT NULL;

-- CreateTable
CREATE TABLE `Membresia` (
    `id` VARCHAR(191) NOT NULL,
    `grueroPerfilId` VARCHAR(191) NOT NULL,
    `monto` DOUBLE NOT NULL DEFAULT 10,
    `referencia` VARCHAR(191) NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `confirmadoEn` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConfiguracionPagoMovil` (
    `id` VARCHAR(191) NOT NULL,
    `banco` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `cedulaORif` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Membresia` ADD CONSTRAINT `Membresia_grueroPerfilId_fkey` FOREIGN KEY (`grueroPerfilId`) REFERENCES `GrueroPerfil`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
