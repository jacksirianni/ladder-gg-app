import { cn } from "@/lib/cn";

type Step = {
  /** Short title for the step. */
  title: string;
  /** Longer explanation. */
  body: string;
  /** Whether this step is the current one to do. */
  current?: boolean;
  /** Whether this step is already done. */
  done?: boolean;
};

type Props = {
  /** Optional eyebrow label above the steps. */
  eyebrow?: string;
  /** Optional headline under the eyebrow. */
  title?: string;
  /** Ordered list of steps. */
  steps: Step[];
  className?: string;
};

/**
 * A vertical numbered list of "what happens next" steps. Used on captain
 * onboarding pages to make the registration → pay → play flow legible.
 *
 * Server-renderable: no client interactivity, just structured copy.
 */
export function NextSteps({ eyebrow, title, steps, className }: Props) {
  return (
    <section
      aria-label={title ?? "Next steps"}
      className={cn(
        "rounded-lg border border-border bg-surface p-5",
        className,
      )}
    >
      {eyebrow && (
        <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="mt-2 text-base font-semibold tracking-tight">
          {title}
        </h2>
      )}
      <ol className={cn("flex flex-col gap-3", (eyebrow || title) && "mt-4")}>
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <StepDot index={i + 1} done={step.done} current={step.current} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.done && "text-foreground-muted",
                  step.current && "text-foreground",
                  !step.done && !step.current && "text-foreground",
                )}
              >
                {step.title}
              </p>
              <p className="mt-0.5 text-sm text-foreground-muted">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepDot({
  index,
  done,
  current,
}: {
  index: number;
  done?: boolean;
  current?: boolean;
}) {
  if (done) {
    return (
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-[11px] font-bold text-success-foreground"
      >
        ✓
      </span>
    );
  }
  if (current) {
    return (
      <span
        aria-hidden
        className="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/60 bg-primary/15 font-mono text-[10px] font-semibold text-primary"
      >
        {index}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-[10px] font-semibold text-foreground-subtle"
    >
      {index}
    </span>
  );
}
