"use client";

import { useActionState, useState } from "react";
import type { LeagueVisibility } from "@prisma/client";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  RegistrationAccessFields,
  toDatetimeLocalValue,
} from "@/components/registration-access-fields";
import {
  updateLeagueAction,
  type UpdateLeagueActionState,
} from "./actions";

type LeagueForEdit = {
  id: string;
  description: string | null;
  game: string;
  teamSize: number;
  maxTeams: number;
  buyInCents: number;
  payoutPreset: "WTA" | "TOP_2" | "TOP_3";
  paymentInstructions: string | null;
  prizeNotes: string | null;
  // v1.6: visibility + scheduling.
  visibility: LeagueVisibility;
  registrationClosesAt: Date | null;
  startsAt: Date | null;
  lookingForTeams: boolean;
};

type Props = {
  league: LeagueForEdit;
  teamCount: number;
};

const initialState: UpdateLeagueActionState = {};

export function EditLeagueButton({ league, teamCount }: Props) {
  const [open, setOpen] = useState(false);

  // Wrap the server action so we can close the modal on success
  // without the cascading-render lint warning that comes from doing
  // it inside a useEffect.
  const wrappedAction = async (
    prev: UpdateLeagueActionState,
    formData: FormData,
  ): Promise<UpdateLeagueActionState> => {
    const result = await updateLeagueAction(prev, formData);
    if (result.success) {
      setOpen(false);
    }
    return result;
  };

  const [state, action, pending] = useActionState(
    wrappedAction,
    initialState,
  );

  const teamSizeLocked = teamCount > 0;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Edit settings
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogTitle>Edit league settings</DialogTitle>
        <DialogDescription>
          Available while the league is DRAFT or OPEN. The league name is not
          editable here.
        </DialogDescription>

        <form action={action} className="mt-6 flex flex-col gap-5">
          <input type="hidden" name="leagueId" value={league.id} />

          <FormField
            label="Description"
            htmlFor="description"
            error={state.fieldErrors?.description}
          >
            <Input
              id="description"
              name="description"
              defaultValue={league.description ?? ""}
              maxLength={500}
            />
          </FormField>

          <FormField
            label="Game"
            htmlFor="game"
            error={state.fieldErrors?.game}
          >
            <Input
              id="game"
              name="game"
              defaultValue={league.game}
              maxLength={50}
              required
            />
          </FormField>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Team size"
              htmlFor="teamSize"
              hint={
                teamSizeLocked
                  ? "Locked once teams have registered."
                  : "Players per team."
              }
              error={state.fieldErrors?.teamSize}
            >
              <Input
                id="teamSize"
                name="teamSize"
                type="number"
                min={1}
                max={10}
                defaultValue={league.teamSize}
                required
                disabled={teamSizeLocked}
              />
            </FormField>

            <FormField
              label="Max teams"
              htmlFor="maxTeams"
              hint={
                teamCount > 0
                  ? `Currently ${teamCount} registered. Cannot reduce below this.`
                  : "Cap on registered teams."
              }
              error={state.fieldErrors?.maxTeams}
            >
              <Input
                id="maxTeams"
                name="maxTeams"
                type="number"
                min={Math.max(2, teamCount)}
                max={32}
                defaultValue={league.maxTeams}
                required
              />
            </FormField>
          </div>

          <FormField
            label="Entry fee (USD)"
            htmlFor="buyInDollars"
            hint="Per team. Captains pay you directly off-platform."
            error={state.fieldErrors?.buyInDollars}
          >
            <Input
              id="buyInDollars"
              name="buyInDollars"
              type="number"
              min={0}
              step="0.01"
              defaultValue={(league.buyInCents / 100).toFixed(2)}
              required
            />
          </FormField>

          <FormField
            label="Prize split"
            htmlFor="payoutPreset"
            hint="How you'll split the prize among top finishers."
            error={state.fieldErrors?.payoutPreset}
          >
            <Select
              id="payoutPreset"
              name="payoutPreset"
              defaultValue={league.payoutPreset}
            >
              <option value="WTA">Winner takes all</option>
              <option value="TOP_2">Top 2: 70 / 30</option>
              <option value="TOP_3">Top 3: 60 / 30 / 10</option>
            </Select>
          </FormField>

          <FormField
            label="Payment instructions"
            htmlFor="paymentInstructions"
            hint="Tell captains how to pay you. e.g. Venmo @your-handle."
            error={state.fieldErrors?.paymentInstructions}
          >
            <Textarea
              id="paymentInstructions"
              name="paymentInstructions"
              defaultValue={league.paymentInstructions ?? ""}
              maxLength={500}
              rows={3}
            />
          </FormField>

          <FormField
            label="Prize notes"
            htmlFor="prizeNotes"
            hint="Describe the prize. e.g. $50 winner, $20 runner-up."
            error={state.fieldErrors?.prizeNotes}
          >
            <Textarea
              id="prizeNotes"
              name="prizeNotes"
              defaultValue={league.prizeNotes ?? ""}
              maxLength={500}
              rows={3}
            />
          </FormField>

          {/* v1.6: visibility + scheduling controls. */}
          <RegistrationAccessFields
            defaults={{
              visibility: league.visibility,
              registrationClosesAt: toDatetimeLocalValue(
                league.registrationClosesAt,
              ),
              startsAt: toDatetimeLocalValue(league.startsAt),
              lookingForTeams: league.lookingForTeams,
            }}
            fieldErrors={state.fieldErrors}
          />

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
