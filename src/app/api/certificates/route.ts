import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Issued certificates registry is removed. Certificates are generated on-demand without storing database records.",
    certificates: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 25,
      totalPages: 0,
    },
  });
}
