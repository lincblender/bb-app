import { redirect } from "next/navigation";

/**
 * App root — redirect to sign-in. The app lives at bidblender.io; this is the entry point.
 */
export default function AppRootPage() {
  redirect("/auth/signin");
}
