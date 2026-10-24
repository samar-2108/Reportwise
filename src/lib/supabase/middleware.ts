import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(_request: NextRequest) {
  void _request;
  // Authentication disabled for debugging purposes
  return NextResponse.next();
}
