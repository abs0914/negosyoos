import { PlatformTopbar } from '../../platform-topbar';

export default function NewBusinessLayout({ children }: { readonly children: React.ReactNode }) {
  return <><PlatformTopbar />{children}</>;
}
