
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const filePath = path.resolve(
      process.cwd(),
      "..",
      "analytics",
      "analysis_result.json"
    );

    const fileContent = await readFile(filePath, "utf-8");
    const analysis = JSON.parse(fileContent);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Gagal membaca hasil analisis Python:", error);

    return NextResponse.json(
      { message: "File hasil analisis Python tidak ditemukan." },
      { status: 500 }
    );
  }
}
