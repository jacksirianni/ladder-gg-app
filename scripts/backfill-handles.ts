/**
 * One-shot backfill that assigns a URL handle to every user that doesn't
 * have one yet. Idempotent — re-running with no null handles is a no-op.
 *
 * Run locally with:
 *   npx tsx scripts/backfill-handles.ts
 */
import { prisma } from "@/lib/db/prisma";
import { generateHandle } from "@/lib/handle";

async function main() {
  let total = 0;
  while (true) {
    const batch = await prisma.user.findMany({
      where: { handle: null },
      select: { id: true, displayName: true },
      take: 50,
    });
    if (batch.length === 0) break;

    for (const u of batch) {
      const handle = await generateHandle(u.displayName, prisma);
      await prisma.user.update({
        where: { id: u.id },
        data: { handle },
      });
      total += 1;
      console.log(`  ${u.id} → ${handle}`);
    }
  }
  console.log(`\nBackfilled ${total} user handle${total === 1 ? "" : "s"}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
