"use client";

import { DemoShell } from "@/components/demo/DemoShell";

export function ConsoleLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <DemoShell>{children}</DemoShell>;
}
