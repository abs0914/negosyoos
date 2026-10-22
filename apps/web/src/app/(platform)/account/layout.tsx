import { requireAuthenticatedUser } from "@negosyo-os/auth";

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAuthenticatedUser();
  return children;
}
