import { z } from "zod";

const MAX_CURSOR_LENGTH = 512;

const productCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

export type ProductCursor = z.infer<typeof productCursorSchema>;

export function encodeProductCursor(cursor: ProductCursor): string {
  return Buffer.from(JSON.stringify(productCursorSchema.parse(cursor)), "utf8").toString("base64url");
}

export function decodeProductCursor(value: string | undefined): ProductCursor | null {
  if (!value || value.length > MAX_CURSOR_LENGTH) {
    return null;
  }

  try {
    return productCursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

export function buildDescendingProductCursorFilter(cursor: ProductCursor): string {
  return [
    `created_at.lt.${cursor.createdAt}`,
    `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
  ].join(",");
}
