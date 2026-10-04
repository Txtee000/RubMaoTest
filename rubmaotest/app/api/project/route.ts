// Frontend-only phase: this placeholder must not pretend to persist data.
export function GET() {
  return Response.json(
    { message: "Project API is not connected. The frontend uses local demo data." },
    { status: 501 },
  );
}
