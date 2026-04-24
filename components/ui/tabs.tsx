"use client";

import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useState } from "react";

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs components must be used within <Tabs>");
  }
  return ctx;
}

type TabsProps = {
  defaultValue: string;
  children: ReactNode;
  className?: string;
};

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("flex flex-col gap-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

type TabsTriggerProps = ComponentProps<"button"> & {
  value: string;
};

export function TabsTrigger({
  value: tabValue,
  className,
  ...props
}: TabsTriggerProps) {
  const { value, setValue } = useTabs();
  const isActive = value === tabValue;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => setValue(tabValue)}
      className={cn(
        "rounded px-3 py-1.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "bg-surface-elevated text-foreground"
          : "text-foreground-muted hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  value: tabValue,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value } = useTabs();
  if (value !== tabValue) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
