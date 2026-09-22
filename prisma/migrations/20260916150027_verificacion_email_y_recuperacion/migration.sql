/*
  Warnings:

  - A unique constraint covering the columns `[tokenVerificacion]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tokenRecuperacion]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `usuario` ADD COLUMN `emailVerificado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tokenRecuperacion` VARCHAR(191) NULL,
    ADD COLUMN `tokenRecuperacionExpira` DATETIME(3) NULL,
    ADD COLUMN `tokenVerificacion` VARCHAR(191) NULL,
    ADD COLUMN `tokenVerificacionExpira` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Usuario_tokenVerificacion_key` ON `Usuario`(`tokenVerificacion`);

-- CreateIndex
CREATE UNIQUE INDEX `Usuario_tokenRecuperacion_key` ON `Usuario`(`tokenRecuperacion`);
