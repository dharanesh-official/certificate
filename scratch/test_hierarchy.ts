import { prisma } from "../src/lib/database/prisma";

async function main() {
  const programs = await prisma.program.findMany({
    include: {
      events: {
        include: {
          _count: {
            select: {
              participants: true,
              certificates: true,
              templates: true,
            },
          },
        },
      },
    },
  });

  console.log("================ PROGRAM -> EVENT -> PARTICIPANTS -> TEMPLATES ================");
  for (const prog of programs) {
    console.log(`\n🏛️  PROGRAM: ${prog.name} [Code: ${prog.code}] (Status: ${prog.status})`);
    console.log(`   Dates: ${prog.start_date || "N/A"} - ${prog.end_date || "N/A"} | Dept: ${prog.department || "N/A"}`);
    console.log(`   Events Count: ${prog.events.length}`);

    for (const ev of prog.events) {
      console.log(`\n   ├── 🎯 EVENT: ${ev.name} [Code: ${ev.event_code}] (Date: ${ev.event_date})`);
      console.log(`   │   ├── 👥 Participants: ${ev._count.participants} rostered`);
      console.log(`   │   ├── 📜 Templates:    ${ev._count.templates} custom templates`);
      console.log(`   │   └── 🏆 Certificates: ${ev._count.certificates} issued`);
    }
  }

  // Also verify standalone events
  const standaloneEvents = await prisma.event.findMany({
    where: { program_id: null },
    include: {
      _count: {
        select: {
          participants: true,
          certificates: true,
          templates: true,
        },
      },
    },
  });
  console.log(`\nStandalone Events (no umbrella program): ${standaloneEvents.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
