import { ConsoleLayoutWrapper } from "./ConsoleLayoutWrapper";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConsoleLayoutWrapper>{children}</ConsoleLayoutWrapper>;
}
