/**
 * Recalcula saldoPendientePago de cada gruero desde cero, a partir de los
 * datos reales: suma de `pago.monto` de sus servicios COMPLETADOS pagados
 * por Pago Móvil o Saldo, menos lo que ya se le pagó (SolicitudPago
 * CONFIRMADO). Corrige cualquier desfase acumulado por el bug donde el
 * saldo pendiente de Pago Móvil no se acreditaba al completar el servicio.
 *
 * Uso: npx tsx scripts/recalcular-saldos.ts
 */
import { prisma } from '../src/shared/lib/prisma.js';

async function main() {
  const grueros = await prisma.grueroPerfil.findMany();
  let corregidos = 0;

  for (const g of grueros) {
    const servicios = await prisma.servicio.findMany({
      where: { grueroPerfilId: g.id, estado: 'COMPLETADO' },
      include: { pago: true },
    });

    const ganadoPendiente = servicios
      .filter((s) => s.pago && s.pago.metodo !== 'EFECTIVO')
      .reduce((acc, s) => acc + (s.pago?.monto ?? 0), 0);

    const pagado = await prisma.solicitudPago.aggregate({
      where: { grueroPerfilId: g.id, estado: 'CONFIRMADO' },
      _sum: { monto: true },
    });

    const correcto = Number((ganadoPendiente - (pagado._sum.monto ?? 0)).toFixed(2));

    if (Math.abs(correcto - g.saldoPendientePago) > 0.01) {
      console.log(`Gruero ${g.id} (${g.placa}): ${g.saldoPendientePago} -> ${correcto}`);
      await prisma.grueroPerfil.update({ where: { id: g.id }, data: { saldoPendientePago: correcto } });
      corregidos++;
    }
  }

  console.log(`Listo. ${corregidos} gruero(s) corregido(s) de ${grueros.length} total.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
