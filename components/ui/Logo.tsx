import { BbLogo } from "./BbLogo";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: 32,
  md: 40,
  lg: 56,
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  const px = sizes[size];
  return <BbLogo size={px} className={className} />;
}
