import { randomBytes } from "crypto";

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}
