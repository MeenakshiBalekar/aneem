import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await registerUser(parsed.data);
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Registration failed" }, { status: 409 });
  }
}
