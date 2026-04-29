"use client";

import { useActionState, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import {
  updateProfileAction,
  type UpdateProfileState,
} from "@/app/account/actions";

const initialState: UpdateProfileState = {};

type Props = {
  /** Current user — drives initial state + the live preview. */
  user: {
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
  };
};

const BIO_MAX = 200;

/**
 * v2.0: avatar + bio editor. Upload flow mirrors the v1.8 evidence
 * uploader (file picker → /api/upload-avatar → URL into hidden input).
 *
 * Live preview keeps the avatar/initials in sync as the user uploads
 * or clears their image, with fallback initials derived from
 * displayName when no URL is set.
 */
export function ProfileEditForm({ user }: Props) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    initialState,
  );

  // Local state for the URL + bio so the preview updates live.
  const [avatarUrl, setAvatarUrl] = useState<string>(user.avatarUrl ?? "");
  const [bio, setBio] = useState<string>(user.bio ?? "");

  // Upload state — separate from the form's pending status.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setUploadError(json.error ?? "Upload failed.");
        return;
      }
      setAvatarUrl(json.url);
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Avatar uploader. */}
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
          Avatar
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Avatar
            src={avatarUrl || null}
            name={user.displayName}
            size="xl"
          />
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFile}
              className="hidden"
            />
            <input type="hidden" name="avatarUrl" value={avatarUrl} />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? "Uploading…"
                  : avatarUrl
                    ? "Change image"
                    : "Upload image"}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAvatarUrl("")}
                  disabled={uploading}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="font-mono text-[11px] text-foreground-subtle">
              PNG / JPEG / WebP / GIF · 4 MB max
            </p>
            {uploadError && (
              <p className="font-mono text-[11px] text-destructive">
                {uploadError}
              </p>
            )}
            {state.fieldErrors?.avatarUrl && (
              <p className="font-mono text-[11px] text-destructive">
                {state.fieldErrors.avatarUrl}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bio. */}
      <FormField
        label="Bio"
        htmlFor="bio"
        hint={`A short blurb shown on your public profile. ${
          BIO_MAX - bio.length
        } characters left.`}
        error={state.fieldErrors?.bio}
      >
        <Textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          maxLength={BIO_MAX}
          rows={3}
          placeholder='"Smash main since SSB64. Will not pick Bayonetta."'
        />
      </FormField>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
