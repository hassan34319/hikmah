import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "on-dark" | "outline-dark";

function classes(variant: Variant, block?: boolean, size?: "sm") {
  return ["hk-btn", `hk-btn--${variant}`, block && "hk-btn--block", size && `hk-btn--${size}`].filter(Boolean).join(" ");
}

export function Button({
  variant = "primary", block, size, className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; size?: "sm" }) {
  return <button {...rest} className={[classes(variant, block, size), className].filter(Boolean).join(" ")} />;
}

export function ButtonLink({
  href, variant = "primary", block, size, children,
}: { href: string; variant?: Variant; block?: boolean; size?: "sm"; children: ReactNode }) {
  return <Link href={href} className={classes(variant, block, size)}>{children}</Link>;
}
