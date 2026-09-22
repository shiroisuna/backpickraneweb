-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `rol` ENUM('CLIENTE', 'GRUERO', 'ADMIN') NOT NULL,
    `saldoAFavor` DOUBLE NOT NULL DEFAULT 0,
    `fotoPerfilUrl` VARCHAR(191) NULL,
    `cedula` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GrueroPerfil` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `estadoCertificacion` ENUM('PENDIENTE', 'EN_REVISION', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `tipoGrua` VARCHAR(191) NOT NULL,
    `placa` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `latitud` DOUBLE NOT NULL,
    `longitud` DOUBLE NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT false,
    `ultimaLat` DOUBLE NULL,
    `ultimaLng` DOUBLE NULL,
    `ultimaActualizacion` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GrueroPerfil_usuarioId_key`(`usuarioId`),
    UNIQUE INDEX `GrueroPerfil_placa_key`(`placa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Documento` (
    `id` VARCHAR(191) NOT NULL,
    `grueroPerfilId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('FOTO_GRUA', 'LICENCIA', 'CERTIFICADO_MEDICO', 'RCV') NOT NULL,
    `archivoUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Servicio` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `grueroPerfilId` VARCHAR(191) NULL,
    `origenLat` DOUBLE NOT NULL,
    `origenLng` DOUBLE NOT NULL,
    `origenDireccion` VARCHAR(191) NOT NULL,
    `destinoLat` DOUBLE NOT NULL,
    `destinoLng` DOUBLE NOT NULL,
    `destinoDireccion` VARCHAR(191) NOT NULL,
    `distanciaKm` DOUBLE NULL,
    `duracionMin` INTEGER NULL,
    `tarifaEstimada` DOUBLE NULL,
    `estado` ENUM('PENDIENTE_PAGO', 'SOLICITADO', 'ASIGNADO', 'EN_CAMINO', 'LLEGADA', 'EN_TRASLADO', 'COMPLETADO', 'CANCELADO') NOT NULL DEFAULT 'SOLICITADO',
    `horaAsignado` DATETIME(3) NULL,
    `horaEnCamino` DATETIME(3) NULL,
    `horaLlegada` DATETIME(3) NULL,
    `horaEnTraslado` DATETIME(3) NULL,
    `horaCompletado` DATETIME(3) NULL,
    `fotoEnganche` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pago` (
    `id` VARCHAR(191) NOT NULL,
    `servicioId` VARCHAR(191) NOT NULL,
    `metodo` ENUM('EFECTIVO', 'PAGO_MOVIL') NOT NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `monto` DOUBLE NOT NULL,
    `referencia` VARCHAR(191) NULL,
    `montoEntregado` DOUBLE NULL,
    `vuelto` DOUBLE NULL,
    `comisionPlataforma` DOUBLE NULL,
    `declaradoPorGrueroEn` DATETIME(3) NULL,
    `confirmadoEn` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Pago_servicioId_key`(`servicioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Calificacion` (
    `id` VARCHAR(191) NOT NULL,
    `servicioId` VARCHAR(191) NOT NULL,
    `grueroPerfilId` VARCHAR(191) NOT NULL,
    `estrellas` INTEGER NOT NULL,
    `comentario` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Calificacion_servicioId_key`(`servicioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mensaje` (
    `id` VARCHAR(191) NOT NULL,
    `servicioId` VARCHAR(191) NOT NULL,
    `autorId` VARCHAR(191) NOT NULL,
    `texto` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GrueroPerfil` ADD CONSTRAINT `GrueroPerfil_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documento` ADD CONSTRAINT `Documento_grueroPerfilId_fkey` FOREIGN KEY (`grueroPerfilId`) REFERENCES `GrueroPerfil`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Servicio` ADD CONSTRAINT `Servicio_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Servicio` ADD CONSTRAINT `Servicio_grueroPerfilId_fkey` FOREIGN KEY (`grueroPerfilId`) REFERENCES `GrueroPerfil`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pago` ADD CONSTRAINT `Pago_servicioId_fkey` FOREIGN KEY (`servicioId`) REFERENCES `Servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calificacion` ADD CONSTRAINT `Calificacion_servicioId_fkey` FOREIGN KEY (`servicioId`) REFERENCES `Servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calificacion` ADD CONSTRAINT `Calificacion_grueroPerfilId_fkey` FOREIGN KEY (`grueroPerfilId`) REFERENCES `GrueroPerfil`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mensaje` ADD CONSTRAINT `Mensaje_servicioId_fkey` FOREIGN KEY (`servicioId`) REFERENCES `Servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mensaje` ADD CONSTRAINT `Mensaje_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
