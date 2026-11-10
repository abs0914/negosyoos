import Link from 'next/link';
import { Brand, Icon } from '@negosyo-os/ui';

export function PlatformTopbar() {
  return <header className="platform-topbar"><Link aria-label="Your businesses" href="/dashboard"><Brand /></Link><Link href="/dashboard"><Icon name="chevron-left" size={16} />Your businesses</Link></header>;
}
