"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string } | null;

// Supabase Auth owns the identity; public.User mirrors it so calendars and
// events can hold foreign keys (auth.users lives in a schema Prisma doesn't manage).
async function syncUser(id: string, email: string) {
  await prisma.user.upsert({
    where: { id },
    update: { email },
    create: { id, email },
  });
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  await syncUser(data.user.id, data.user.email ?? email);
  redirect("/calendars");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };

  // No session means the project requires email confirmation before first login.
  if (!data.session || !data.user) {
    return { notice: "확인 메일을 보냈습니다. 메일의 링크를 눌러 인증한 뒤 로그인해주세요." };
  }

  await syncUser(data.user.id, data.user.email ?? email);
  redirect("/calendars");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
