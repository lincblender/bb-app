import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BbLogo } from "@/components/ui/BbLogo";

export default function NotFound() {
  return (
    <div className="bb-bg-base flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <Link href="/" className="mb-8">
        <BbLogo size={40} />
      </Link>
      <p className="text-6xl font-bold text-bb-powder-blue/30">404</p>
      <h1 className="mt-4 text-2xl font-bold bb-text-primary md:text-3xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-center bb-text-muted">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button href="/" variant="primary">
          Back to app
        </Button>
        <Button href="/auth/signin" variant="secondary">
          Sign in
        </Button>
      </div>
    </div>
  );
}
