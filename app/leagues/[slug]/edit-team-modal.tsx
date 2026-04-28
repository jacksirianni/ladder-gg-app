"use client";

import { useActionState, useState } from "react";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  updateTeamAction,
  type TeamActionState,
} from "./actions";

type TeamForEdit = {
  id: string;
  name: string;
  roster: { displayName: string; position: number }[];
};

type Props = {
  team: TeamForEdit;
  teamSize: number;
};

const initialState: TeamActionState = {};

export function EditTeamButton({ team, teamSize }: Props) {
  const [open, setOpen] = useState(false);

  const wrappedAction = async (
    prev: TeamActionState,
    formData: FormData,
  ): Promise<TeamActionState> => {
    const result = await updateTeamAction(prev, formData);
    if (result.success) {
      setOpen(false);
    }
    return result;
  };

  const [state, action, pending] = useActionState(wrappedAction, initialState);

  const rosterCount = Math.max(0, teamSize - 1);
  const sortedRoster = [...team.roster].sort((a, b) => a.position - b.position);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Edit team
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogTitle>Edit team</DialogTitle>
        <DialogDescription>
          Update your team name or roster. Only available before the league
          starts.
        </DialogDescription>

        <form action={action} className="mt-6 flex flex-col gap-5">
          <input type="hidden" name="teamId" value={team.id} />

          <FormField
            label="Team name"
            htmlFor="name"
            error={state.fieldErrors?.name}
          >
            <Input
              id="name"
              name="name"
              defaultValue={team.name}
              maxLength={80}
              required
            />
          </FormField>

          {rosterCount > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">
                Roster ({rosterCount} other{" "}
                {rosterCount === 1 ? "player" : "players"})
              </p>
              {Array.from({ length: rosterCount }).map((_, i) => (
                <FormField
                  key={i}
                  label={`Player ${i + 2}`}
                  htmlFor={`roster-edit-${i}`}
                  error={state.fieldErrors?.[`rosterMembers.${i}`]}
                >
                  <Input
                    id={`roster-edit-${i}`}
                    name="rosterMembers"
                    maxLength={50}
                    defaultValue={sortedRoster[i]?.displayName ?? ""}
                    required
                  />
                </FormField>
              ))}
            </div>
          )}

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
