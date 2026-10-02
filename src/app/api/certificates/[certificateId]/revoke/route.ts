import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Issued certificates registry is removed. Certificates are generated dynamically on demand without persistent database issuance records." },
    { status: 200 }
  );
}
