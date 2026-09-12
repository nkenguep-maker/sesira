import client from "@/generated/landing-images/client-tiny";
import editorial from "@/generated/landing-images/editorial-tiny";
import finance from "@/generated/landing-images/finance-tiny";
import planning from "@/generated/landing-images/planning-tiny";
import team from "@/generated/landing-images/team-tiny";

const IMAGES = { client, editorial, finance, planning, team } as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const encoded = IMAGES[name as keyof typeof IMAGES];

  if (!encoded) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(Buffer.from(encoded, "base64"), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
