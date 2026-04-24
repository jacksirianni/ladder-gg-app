import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
