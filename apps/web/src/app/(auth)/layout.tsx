import Link from "next/link";
import { Brand } from "@negosyo-os/ui";

export default function AuthLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <main className="auth-screen">
      <aside className="auth-story">
        <Link aria-label="NegosyoOS home" className="auth-home" href="/"><Brand /></Link>
        <div>
          <p className="design-label"><span className="label-dot" /> Built for Philippine small businesses</p>
          <p className="auth-story-title">Your business, <em>in order.</em></p>
        </div>
      </aside>
      <div className="auth-form-wrap">{children}</div>
    </main>
  );
}
