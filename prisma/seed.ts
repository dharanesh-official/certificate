import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_CONFIG = {
  title: "CERTIFICATE OF PARTICIPATION",
  subtitle: "THIS IS PROUDLY PRESENTED TO",
  descriptionText: "for active and meritorious participation in the event organized by",
  backgroundColor: "#F5F5DC",
  borderStyle: "ornate-gold",
  showSeal: true,
  sealText: "OFFICIAL VERIFIED",
  fields: [
    {
      id: "field-header-org",
      key: "ORGANIZER",
      label: "Organizer / Institution",
      type: "text",
      defaultText: "KONGU ENGINEERING COLLEGE (AUTONOMOUS)",
      x: 50,
      y: 14,
      width: 80,
      height: 6,
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      fontWeight: "bold",
      textAlign: "center",
      color: "#8D6E63",
      letterSpacing: 2,
    },
    {
      id: "field-title",
      key: "TITLE",
      label: "Certificate Title",
      type: "text",
      defaultText: "CERTIFICATE OF PARTICIPATION",
      x: 50,
      y: 22,
      width: 80,
      height: 8,
      fontSize: 26,
      fontFamily: "Times-Bold",
      fontWeight: "bold",
      textAlign: "center",
      color: "#C62828",
      letterSpacing: 3,
    },
    {
      id: "field-subtitle",
      key: "SUBTITLE",
      label: "Subtitle",
      type: "text",
      defaultText: "THIS IS PROUDLY PRESENTED TO",
      x: 50,
      y: 31,
      width: 60,
      height: 4,
      fontSize: 11,
      fontFamily: "Helvetica",
      fontWeight: "normal",
      textAlign: "center",
      color: "#57534E",
      letterSpacing: 2,
    },
    {
      id: "field-participant-name",
      key: "PARTICIPANT_NAME",
      label: "Participant Name",
      type: "text",
      defaultText: "{{PARTICIPANT_NAME}}",
      x: 50,
      y: 41,
      width: 80,
      height: 10,
      fontSize: 28,
      fontFamily: "Times-Bold",
      fontWeight: "bold",
      textAlign: "center",
      color: "#1C1917",
      letterSpacing: 1,
    },
    {
      id: "field-participant-details",
      key: "ROLL_NUMBER",
      label: "Roll Number & Dept",
      type: "text",
      defaultText: "Roll No: {{ROLL_NUMBER}}",
      x: 50,
      y: 50,
      width: 70,
      height: 5,
      fontSize: 13,
      fontFamily: "Helvetica-Bold",
      fontWeight: "bold",
      textAlign: "center",
      color: "#57534E",
    },
    {
      id: "field-description",
      key: "DESCRIPTION",
      label: "Event Body Text",
      type: "text",
      defaultText: "for successful participation in {{EVENT_NAME}} organized on {{EVENT_DATE}}",
      x: 50,
      y: 57,
      width: 76,
      height: 7,
      fontSize: 13,
      fontFamily: "Times-Roman",
      fontWeight: "normal",
      textAlign: "center",
      color: "#292524",
    },
    {
      id: "field-qr",
      key: "QR_CODE",
      label: "Verification QR Code",
      type: "qr",
      x: 12,
      y: 77,
      width: 14,
      height: 14,
      fontSize: 10,
      textAlign: "center",
      color: "#1C1917",
      qrSize: 75,
      qrMargin: 1,
    },
    {
      id: "field-cert-id",
      key: "CERTIFICATE_ID",
      label: "Certificate ID",
      type: "text",
      defaultText: "ID: {{CERTIFICATE_ID}}",
      x: 88,
      y: 86,
      width: 30,
      height: 5,
      fontSize: 10,
      fontFamily: "Courier",
      fontWeight: "bold",
      textAlign: "right",
      color: "#57534E",
      letterSpacing: 1,
    },
    {
      id: "field-sign-1",
      key: "CUSTOM_TEXT_1",
      label: "Left Signatory",
      type: "custom_text",
      defaultText: "Dr. K. S. Ravichandran\nConvenor / Coordinator",
      x: 28,
      y: 84,
      width: 25,
      height: 7,
      fontSize: 10,
      fontFamily: "Helvetica",
      fontWeight: "normal",
      textAlign: "center",
      color: "#44403C",
    },
    {
      id: "field-sign-2",
      key: "CUSTOM_TEXT_2",
      label: "Right Signatory",
      type: "custom_text",
      defaultText: "Dr. P. Balasubramanian\nPrincipal & Patron",
      x: 72,
      y: 84,
      width: 25,
      height: 7,
      fontSize: 10,
      fontFamily: "Helvetica",
      fontWeight: "normal",
      textAlign: "center",
      color: "#44403C",
    },
  ],
};

async function main() {
  console.log("Seeding database...");

  // 1. Seed Admin
  const adminEmail = "admin@certportal.gov";
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  const passwordHash = await bcrypt.hash("Admin@2026!Cert", 12);

  let admin;
  if (!existingAdmin) {
    admin = await prisma.admin.create({
      data: {
        email: adminEmail,
        name: "Portal Administrator",
        password_hash: passwordHash,
        role: "ADMIN",
      },
    });
    console.log("Admin created: admin@certportal.gov");
  } else {
    admin = existingAdmin;
    console.log("Admin already exists.");
  }

  // 2. Seed Event
  const eventCode = "TECH-2026";
  let event = await prisma.event.findUnique({
    where: { event_code: eventCode },
  });

  if (!event) {
    event = await prisma.event.create({
      data: {
        event_code: eventCode,
        name: "Tech Symposium 2026",
        description: "Annual National Technology and Innovation Symposium hosted by Kongu Engineering College.",
        event_date: "02 October 2026",
        start_time: "09:30 AM",
        end_time: "05:00 PM",
        venue: "Convention Center & Auditorium",
        organizer: "Kongu Engineering College (Autonomous)",
        department: "Department of Computer Science & Engineering",
        status: "ACTIVE",
      },
    });
    console.log("Event created: Tech Symposium 2026");
  }

  // 3. Seed Template
  const existingTemplate = await prisma.certificateTemplate.findFirst({
    where: { event_id: event.id, is_active: true },
  });

  if (!existingTemplate) {
    await prisma.certificateTemplate.create({
      data: {
        event_id: event.id,
        template_reference: "default-ornate-gold",
        width: 842,
        height: 595,
        configuration_json: JSON.stringify(DEFAULT_CONFIG),
        version: 1,
        is_active: true,
      },
    });
    console.log("Certificate template created.");
  }

  // 4. Seed Participants
  const participants = [
    {
      roll_number: "24ISR011",
      name: "Dharanesh Kumar",
      email: "dharanesh@example.com",
      department: "M.Sc Software Systems",
      institution: "Kongu Engineering College",
      eligible: true,
    },
    {
      roll_number: "24ISR012",
      name: "Arun Kumar",
      email: "arun@example.com",
      department: "M.Sc Software Systems",
      institution: "Kongu Engineering College",
      eligible: true,
    },
    {
      roll_number: "24ISR015",
      name: "Priya Sharma",
      email: "priya@example.com",
      department: "Department of Computer Science & Engineering",
      institution: "Kongu Engineering College",
      eligible: true,
    },
    {
      roll_number: "24ISR020",
      name: "Kavitha R",
      email: "kavitha@example.com",
      department: "Department of Information Technology",
      institution: "Kongu Engineering College",
      eligible: true,
    },
  ];

  for (const p of participants) {
    await prisma.participant.upsert({
      where: {
        event_id_roll_number: {
          event_id: event.id,
          roll_number: p.roll_number,
        },
      },
      update: {},
      create: {
        event_id: event.id,
        roll_number: p.roll_number,
        name: p.name,
        email: p.email,
        department: p.department,
        institution: p.institution,
        eligible: p.eligible,
      },
    });
  }
  console.log(`Seeded ${participants.length} participants.`);

  // 5. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      admin_id: admin.id,
      admin_email: admin.email,
      action: "SYSTEM_INITIALIZED",
      entity_type: "System",
      details: "Initial system configuration and Tech Symposium 2026 event setup.",
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
