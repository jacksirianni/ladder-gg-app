"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DevComponentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 md:px-12">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Design primitives
        </h1>
        <p className="mt-2 text-foreground-muted">
          Internal showcase page. Not linked from the live site.
        </p>
      </header>

      <Section title="Button · variants">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </Section>

      <Section title="Button · sizes">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Badge · league states">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Draft</Badge>
          <Badge variant="info">Open</Badge>
          <Badge variant="primary">In progress</Badge>
          <Badge variant="success">Completed</Badge>
          <Badge variant="destructive">Cancelled</Badge>
          <Badge variant="warning">Attention</Badge>
        </div>
      </Section>

      <Section title="Input + FormField">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Email"
            htmlFor="demo-email"
            hint="We never share this."
          >
            <Input
              id="demo-email"
              type="email"
              placeholder="you@example.com"
            />
          </FormField>
          <FormField
            label="Display name"
            htmlFor="demo-name"
            error="Display name is required."
          >
            <Input id="demo-name" placeholder="Your name" />
          </FormField>
        </div>
      </Section>

      <Section title="Select">
        <FormField label="Payout preset" htmlFor="demo-preset">
          <Select id="demo-preset" defaultValue="WTA">
            <option value="WTA">Winner takes all</option>
            <option value="TOP_2">70 / 30</option>
            <option value="TOP_3">60 / 30 / 10</option>
          </Select>
        </FormField>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Default card</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Static container with border-only elevation.
            </p>
          </Card>
          <Card interactive tabIndex={0}>
            <h3 className="font-semibold">Interactive card</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Hover or focus to see the border brighten.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Avatar · initials only">
        <div className="flex items-center gap-4">
          <Avatar name="Jack Sirianni" size="sm" />
          <Avatar name="Jack Sirianni" size="md" />
          <Avatar name="Jack Sirianni" size="lg" />
          <Avatar name="Single" />
          <Avatar name="Three Word Name" />
        </div>
      </Section>

      <Section title="Dialog">
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle>Example dialog</DialogTitle>
          <DialogDescription>
            Native dialog element with backdrop blur. Press Esc or click outside
            to close.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
          </div>
        </Dialog>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Card>Overview tab content.</Card>
          </TabsContent>
          <TabsContent value="teams">
            <Card>Teams tab content.</Card>
          </TabsContent>
          <TabsContent value="matches">
            <Card>Matches tab content.</Card>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="No leagues yet"
          description="Create your first league to see it here."
          action={<Button>Create a league</Button>}
        />
      </Section>

      <Section title="Skeleton">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12 border-t border-border pt-8">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        {title}
      </h2>
      {children}
    </section>
  );
}
