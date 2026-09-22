-- AlterTable
ALTER TABLE `grueroperfil` MODIFY `direccion` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `mensaje` MODIFY `texto` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `servicio` MODIFY `origenDireccion` TEXT NOT NULL,
    MODIFY `destinoDireccion` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `usuario` MODIFY `direccion` TEXT NULL;
