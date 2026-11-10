import { requireAuthenticatedUser } from "@negosyo-os/auth";
import { PlatformTopbar } from '../platform-topbar';

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAuthenticatedUser();
  return <><PlatformTopbar />{children}</>;
}
