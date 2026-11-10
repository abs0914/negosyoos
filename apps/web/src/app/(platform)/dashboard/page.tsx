/* eslint-disable @next/next/no-img-element -- Private signed business logos cannot use the static Next Image allowlist. */
import Link from 'next/link';
import { getBusinessLogoUrl, getBusinessSettings, listBusinesses } from '@negosyo-os/business/server';
import { Brand, Button, Card, EmptyState, Icon } from '@negosyo-os/ui';
import { hasPlatformAdminAccess } from '@negosyo-os/platform-admin/server';
import { switchBusinessAction } from '@/app/(platform)/business/actions';

export default async function DashboardPage() {
    const [businesses, showPlatformAdmin] = await Promise.all([listBusinesses(), hasPlatformAdminAccess()]);
    const businessesWithBrand = await Promise.all(
        businesses.map(async (business) => ({
            business,
            logoUrl: await getBusinessLogoUrl(business.id, business.logo).catch(() => null),
            settings: await getBusinessSettings(business.id)
        }))
    );
    return (
        <main className="min-h-screen">
            <header className="site-header">
                <div className="site-width site-header-inner">
                    <Link aria-label="negosyoOS home" href="/">
                        <Brand />
                    </Link>
                    <div className="flex items-center gap-2">
                        {showPlatformAdmin ? (
                            <Link
                                className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-muted sm:inline-flex"
                                href="/platform-admin"
                            >
                                Platform admin
                            </Link>
                        ) : null}
                        <Link
                            aria-label="Account"
                            className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary"
                            href="/account"
                        >
                            <Icon name="user" size={18} />
                        </Link>
                    </div>
                </div>
            </header>
            <div className="site-width py-8 sm:py-12">
                <section aria-labelledby="directory-title" className="directory-intro">
                    <div>
                        <p className="design-label"><span className="label-dot" /> Workspace directory</p>
                        <h1 id="directory-title">Your <em>businesses.</em></h1>
                        <p>Choose the business you want to work in today. Each workspace keeps its own team, branches, records, and tools.</p>
                    </div>
                    <div className="flex">
                        <Link className="workspace-action" href="/business/new">
                            <Icon name="plus" size={16} /> Create business
                        </Link>
                    </div>
                </section>
                {businesses.length ? (
                    <section
                        aria-label="Business workspaces"
                        className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                    >
                        {businessesWithBrand.map(({ business, logoUrl, settings }) => (
                            <Card
                                className="group overflow-hidden transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg"
                                key={business.id}
                            >
                                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${settings.primaryColor}, ${settings.secondaryColor}, ${settings.accentColor})` }} />
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-primary-soft text-lg font-black text-primary">
                                            {logoUrl ? <img alt="" className="h-full w-full object-contain p-1" src={logoUrl}/> : business.tradeName.slice(0, 1).toUpperCase()}
                                        </span>
                                        <span className="rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-black text-success">
                                            ACTIVE
                                        </span>
                                    </div>
                                    <p className="mt-6 text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
                                        {business.businessType.replaceAll('_', ' ')}
                                    </p>
                                    <h2 className="mt-2 truncate text-xl font-bold tracking-tight">
                                        {business.tradeName}
                                    </h2>
                                    <p className="mt-1 truncate text-sm text-muted-foreground">{business.legalName}</p>
                                    <form action={switchBusinessAction} className="mt-6">
                                        <input name="businessId" type="hidden" value={business.id} />
                                        <Button className="w-full" type="submit">
                                            Open workspace <Icon name="chevron-right" size={16} />
                                        </Button>
                                    </form>
                                </div>
                            </Card>
                        ))}
                    </section>
                ) : (
                    <EmptyState
                        className="mt-10"
                        icon={<Icon name="business" size={22} />}
                        title="Create your first business workspace"
                        description="Start with your business identity and main branch. You can add tools, people, and operating details when you are ready."
                        action={
                            <Link
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
                                href="/business/new"
                            >
                                <Icon name="plus" size={16} />
                                Create my business
                            </Link>
                        }
                    />
                )}
                <section className="mt-12 grid gap-4 border-t pt-8 sm:grid-cols-3">
                    <div>
                        <p className="text-sm font-bold">Separate and secure</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Every business keeps its own data and access rules.
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-bold">Built around your work</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Only enabled tools appear in each workspace.
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-bold">Easy to switch</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Move between businesses without mixing their records.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}
