import { PrismaClient } from "@prisma/client";
import { DEFAULT_TEMPLATE_CONFIG } from "../src/lib/certificate/defaultTemplate";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Quantum Fest Program & Child Events...");

  // 1. Program: Quantum Fest 2026
  let program = await prisma.program.findUnique({
    where: { code: "QUANTUM-2026" },
  });

  if (!program) {
    program = await prisma.program.create({
      data: {
        code: "QUANTUM-2026",
        name: "Quantum Fest 2026",
        description: "National Level Inter-Collegiate Technical Symposium & Innovation Fest featuring multiple competitive tracks.",
        start_date: "15 October 2026",
        end_date: "16 October 2026",
        venue: "Main Auditorium & Convention Hall",
        organizer: "Kongu Engineering College (Autonomous)",
        department: "School of Computer Sciences",
        status: "ACTIVE",
      },
    });
    console.log("Created Program: Quantum Fest 2026 (ID:", program.id, ")");
  } else {
    console.log("Found existing Program: Quantum Fest 2026");
  }

  // 2. Events under Quantum Fest
  const eventsData = [
    {
      name: "Paper Presentation",
      code: "QF-PAPER-2026",
      desc: "Presentation of novel research papers in Artificial Intelligence, Cloud Computing, and Cybersecurity.",
      date: "15 October 2026",
      venue: "Seminar Hall A",
      time: "10:00 AM - 01:00 PM",
      participants: [
        { roll: "24ISR011", name: "Dharanesh Kumar", email: "dharanesh@example.com", dept: "M.Sc Software Systems" },
        { roll: "24ISR012", name: "Arun Kumar", email: "arun@example.com", dept: "M.Sc Software Systems" },
        { roll: "24BCS045", name: "Deepika R", email: "deepika@example.com", dept: "B.E Computer Science" },
      ],
    },
    {
      name: "Project Presentation",
      code: "QF-PROJ-2026",
      desc: "Working hardware and software prototype demonstration addressing real-world engineering challenges.",
      date: "15 October 2026",
      venue: "IoT & Innovation Lab",
      time: "01:30 PM - 04:30 PM",
      participants: [
        { roll: "24ISR015", name: "Priya Sharma", email: "priya@example.com", dept: "Department of CSE" },
        { roll: "24BIT088", name: "Vigneshwaran M", email: "vignesh@example.com", dept: "B.Tech IT" },
      ],
    },
    {
      name: "Technical Quiz",
      code: "QF-QUIZ-2026",
      desc: "Multi-round battle testing algorithmic thinking, tech trivia, and computer science fundamentals.",
      date: "16 October 2026",
      venue: "Auditorium Stage",
      time: "10:00 AM - 12:30 PM",
      participants: [
        { roll: "24ISR020", name: "Kavitha R", email: "kavitha@example.com", dept: "Information Technology" },
        { roll: "24BCS102", name: "Siddharth N", email: "siddharth@example.com", dept: "Computer Science & Engg" },
        { roll: "24BAE019", name: "Ananya Iyer", email: "ananya@example.com", dept: "AI & Data Science" },
      ],
    },
    {
      name: "Poster Presentation",
      code: "QF-POSTER-2026",
      desc: "Visual presentation and infographics on emerging green computing and sustainable technologies.",
      date: "16 October 2026",
      venue: "Library Exhibition Corridor",
      time: "02:00 PM - 04:00 PM",
      participants: [
        { roll: "24BCS210", name: "Manoj Kumar", email: "manoj@example.com", dept: "Computer Science & Engg" },
        { roll: "24BIT140", name: "Harini S", email: "harini@example.com", dept: "Information Technology" },
      ],
    },
  ];

  for (const item of eventsData) {
    let ev = await prisma.event.findUnique({
      where: { event_code: item.code },
    });

    if (!ev) {
      ev = await prisma.event.create({
        data: {
          program_id: program.id,
          name: item.name,
          event_code: item.code,
          description: item.desc,
          event_date: item.date,
          start_time: item.time.split(" - ")[0],
          end_time: item.time.split(" - ")[1],
          venue: item.venue,
          organizer: "Kongu Engineering College (Autonomous)",
          department: "School of Computer Sciences",
          status: "ACTIVE",
        },
      });
      console.log(`Created Event: ${item.name} under Quantum Fest`);
    } else {
      // Ensure it is linked to Quantum Fest
      await prisma.event.update({
        where: { id: ev.id },
        data: { program_id: program.id },
      });
      console.log(`Updated Event: ${item.name} linked to Quantum Fest`);
    }

    // Ensure it has its own CertificateTemplate
    const existingTemplate = await prisma.certificateTemplate.findFirst({
      where: { event_id: ev.id, is_active: true },
    });

    if (!existingTemplate) {
      // Create specific template config with event name customized
      const customConfig = {
        ...DEFAULT_TEMPLATE_CONFIG,
        title: `CERTIFICATE OF EXCELLENCE`,
        subtitle: `AWARDED FOR MERITORIOUS PARTICIPATION IN`,
      };

      await prisma.certificateTemplate.create({
        data: {
          event_id: ev.id,
          template_reference: "default-ornate-gold",
          width: 842,
          height: 595,
          configuration_json: JSON.stringify(customConfig),
          version: 1,
          is_active: true,
        },
      });
      console.log(`  -> Created distinct template for: ${item.name}`);
    }

    // Ensure participants are seeded
    for (const p of item.participants) {
      await prisma.participant.upsert({
        where: {
          event_id_roll_number: {
            event_id: ev.id,
            roll_number: p.roll,
          },
        },
        update: {},
        create: {
          event_id: ev.id,
          roll_number: p.roll,
          name: p.name,
          email: p.email,
          department: p.dept,
          institution: "Kongu Engineering College",
          eligible: true,
        },
      });
    }
    console.log(`  -> Seeded ${item.participants.length} participants for ${item.name}`);
  }

  // Also check if Tech Symposium 2026 has a program or link to an Academic Conferences program
  const techSymp = await prisma.event.findUnique({
    where: { event_code: "TECH-2026" },
  });
  if (techSymp && !techSymp.program_id) {
    let academicProg = await prisma.program.findUnique({
      where: { code: "ACAD-2026" },
    });
    if (!academicProg) {
      academicProg = await prisma.program.create({
        data: {
          code: "ACAD-2026",
          name: "Annual Technology Symposia 2026",
          description: "Institutional Academic Conferences & Technical Summits",
          start_date: "02 October 2026",
          end_date: "02 October 2026",
          venue: "Auditorium",
          organizer: "Kongu Engineering College (Autonomous)",
          department: "Department of Computer Science & Engineering",
          status: "ACTIVE",
        },
      });
    }
    await prisma.event.update({
      where: { id: techSymp.id },
      data: { program_id: academicProg.id },
    });
  }

  console.log("Seeding Quantum Fest hierarchy completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
