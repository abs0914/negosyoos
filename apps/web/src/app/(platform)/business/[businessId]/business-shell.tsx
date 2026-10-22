'use client';

/* eslint-disable @next/next/no-img-element -- Private signed logo URLs cannot use the static Next Image allowlist. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Brand, Icon } from '@negosyo-os/ui';

export interface BusinessShellNavItem {
    readonly badge?: string;
    readonly href: string;
    readonly icon?: string;
    readonly label: string;
    readonly mobileLabel?: string;
}
export interface BusinessShellNavGroup {
    readonly items: readonly BusinessShellNavItem[];
    readonly label: string;
}
interface BusinessShellProps {
    readonly base: string;
    readonly businessName: string;
    readonly businessLogoUrl: string | null;
    readonly children: React.ReactNode;
    readonly groups: readonly BusinessShellNavGroup[];
    readonly primaryItems: readonly BusinessShellNavItem[];
    readonly theme: { primary: string; secondary: string; accent: string };
    readonly trial?: { daysRemaining: number; href: string } | undefined;
}

function readableForeground(hex: string): '#ffffff' | '#10243e' {
    const value = hex.slice(1);
    const red = Number.parseInt(value.slice(0, 2), 16);
    const green = Number.parseInt(value.slice(2, 4), 16);
    const blue = Number.parseInt(value.slice(4, 6), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? '#10243e' : '#ffffff';
}

function themeStyle(theme: BusinessShellProps['theme']): CSSProperties {
    return {
        '--primary': theme.primary,
        '--primary-hover': `color-mix(in oklab, ${theme.primary} 82%, black)`,
        '--primary-foreground': readableForeground(theme.primary),
        '--primary-soft': `color-mix(in oklab, ${theme.primary} 11%, white)`,
        '--secondary': theme.secondary,
        '--secondary-foreground': readableForeground(theme.secondary),
        '--secondary-soft': `color-mix(in oklab, ${theme.secondary} 11%, white)`,
        '--accent': theme.accent,
        '--accent-foreground': readableForeground(theme.accent),
        '--ring': theme.primary
    } as CSSProperties;
}

function activePath(pathname: string, href: string, base: string) {
    if (href === base) return pathname === base;
    return pathname === href || pathname.startsWith(`${href}/`);
}

function Navigation({
    base,
    collapsed = false,
    groups,
    onNavigate,
    pathname,
    primaryItems
}: {
    base: string;
    collapsed?: boolean;
    groups: readonly BusinessShellNavGroup[];
    onNavigate?: (() => void) | undefined;
    pathname: string;
    primaryItems: readonly BusinessShellNavItem[];
}) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(
            groups.map((group, index) => [
                group.label,
                index === 0 || group.items.some((item) => activePath(pathname, item.href, base))
            ])
        )
    );
    const itemLink = (item: BusinessShellNavItem) => {
        const active = activePath(pathname, item.href, base);
        return (
            <Link
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'} ${collapsed ? 'justify-center' : ''}`}
                href={item.href}
                key={item.href}
                title={collapsed ? item.label : undefined}
                {...(onNavigate ? { onClick: onNavigate } : {})}
            >
                <Icon name={item.icon ?? 'business'} size={18} />
                {collapsed ? null : (
                    <>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary'}`}
                            >
                                {item.badge}
                            </span>
                        ) : null}
                    </>
                )}
            </Link>
        );
    };
    return (
        <nav aria-label="Business navigation" className="space-y-5">
            <div className="space-y-1">{primaryItems.map(itemLink)}</div>
            {groups
                .filter((group) => group.items.length)
                .map((group) => {
                    const open = expanded[group.label] ?? false;
                    const activeCount = group.items.filter((item) => activePath(pathname, item.href, base)).length;
                    if (collapsed)
                        return (
                            <div className="space-y-1 border-t pt-4" key={group.label}>
                                {group.items.map(itemLink)}
                            </div>
                        );
                    return (
                        <section key={group.label}>
                            <button
                                aria-expanded={open}
                                className="flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-[10px] font-black uppercase tracking-[.15em] text-muted-foreground hover:bg-muted"
                                onClick={() => setExpanded((current) => ({ ...current, [group.label]: !open }))}
                                type="button"
                            >
                                <span>{group.label}</span>
                                <span className="flex items-center gap-2">
                                    <span
                                        aria-hidden="true"
                                        className={`h-1.5 w-1.5 rounded-full bg-primary ${activeCount ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    <Icon
                                        className={`transition-transform ${open ? 'rotate-180' : ''}`}
                                        name="chevron-down"
                                        size={14}
                                    />
                                </span>
                            </button>
                            {open ? <div className="mt-1 space-y-1">{group.items.map(itemLink)}</div> : null}
                        </section>
                    );
                })}
        </nav>
    );
}

export function BusinessShell({
    base,
    businessName,
    businessLogoUrl,
    children,
    groups,
    primaryItems,
    theme,
    trial
}: BusinessShellProps) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!mobileOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            document.body.style.overflow = previous;
        };
    }, [mobileOpen]);
    const dailyItems = groups.find((group) => group.label === 'Daily operations')?.items ?? [];
    const coach = primaryItems.find((item) => item.icon === 'coach');
    const alerts = primaryItems.find((item) => item.icon === 'notifications');
    const businessAvatar = businessLogoUrl ? (
        <img alt="" className="h-full w-full object-contain p-1" src={businessLogoUrl} />
    ) : (
        businessName.slice(0, 1).toUpperCase()
    );
    return (
        <div
            className={`min-h-screen xl:grid ${collapsed ? 'xl:grid-cols-[5rem_minmax(0,1fr)]' : 'xl:grid-cols-[18rem_minmax(0,1fr)]'}`}
            style={themeStyle(theme)}
        >
            <aside className="hidden h-screen flex-col border-r bg-card xl:sticky xl:top-0 xl:flex">
                <div
                    className={`flex h-17 items-center border-b ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}
                >
                    <Link aria-label="Business home" className="min-w-0" href={base}>
                        {collapsed ? <Brand compact /> : <Brand />}
                    </Link>
                    {collapsed ? null : (
                        <button
                            aria-label="Collapse sidebar"
                            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => setCollapsed(true)}
                            type="button"
                        >
                            <Icon name="panel-close" size={17} />
                        </button>
                    )}
                </div>
                <div className={`border-b ${collapsed ? 'p-2' : 'px-4 py-4'}`}>
                    {collapsed ? (
                        <button
                            aria-label="Expand sidebar"
                            className="grid h-11 w-full place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                            onClick={() => setCollapsed(false)}
                            type="button"
                        >
                            <Icon name="panel-open" size={18} />
                        </button>
                    ) : (
                        <Link className="group flex items-center gap-3 rounded-xl p-2 hover:bg-muted" href="/dashboard">
                            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-primary-soft text-sm font-black text-primary">
                                {businessAvatar}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold">{businessName}</span>
                                <span className="block text-[10px] font-semibold text-muted-foreground">
                                    Switch business
                                </span>
                            </span>
                            <Icon className="text-muted-foreground" name="chevron-down" size={14} />
                        </Link>
                    )}
                </div>
                <div className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
                    <Navigation
                        base={base}
                        collapsed={collapsed}
                        groups={groups}
                        pathname={pathname}
                        primaryItems={primaryItems}
                    />
                </div>
                {trial ? (
                    <Link
                        aria-label={`${trial.daysRemaining} trial days remaining`}
                        className={`border-t bg-primary-soft text-primary hover:bg-primary-soft/70 ${collapsed ? 'grid min-h-14 place-items-center text-xs font-black' : 'p-4 text-xs leading-5'}`}
                        href={trial.href}
                    >
                        {collapsed ? (
                            trial.daysRemaining
                        ) : (
                            <>
                                <b>{trial.daysRemaining} days</b> remain in your full-access trial
                            </>
                        )}
                    </Link>
                ) : null}
                <div className="border-t p-3">
                    <Link
                        aria-label={collapsed ? 'Help' : undefined}
                        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground ${collapsed ? 'justify-center' : ''}`}
                        href={`${base}/coach`}
                    >
                        <Icon name="help" size={18} />
                        {collapsed ? null : <span>Help & guidance</span>}
                    </Link>
                    <Link
                        aria-label={collapsed ? 'Account' : undefined}
                        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground ${collapsed ? 'justify-center' : ''}`}
                        href="/account"
                    >
                        <Icon name="user" size={18} />
                        {collapsed ? null : <span>Account</span>}
                    </Link>
                </div>
            </aside>
            <div className="min-w-0 pb-20 xl:pb-0">
                <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/92 px-4 backdrop-blur-xl xl:px-6">
                    <div className="flex min-w-0 items-center gap-3 xl:hidden">
                        <Link aria-label="negosyoOS" href={base}>
                            <Brand compact />
                        </Link>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{businessName}</p>
                            <p className="text-[10px] font-semibold text-muted-foreground">Business workspace</p>
                        </div>
                    </div>
                    <div className="hidden min-w-0 xl:block">
                        <p className="truncate text-sm font-bold">{businessName}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground">Today’s workspace</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Link
                            aria-label="Notifications"
                            className="relative grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                            href={alerts?.href ?? `${base}/notifications`}
                        >
                            <Icon name="bell" size={19} />
                            {alerts?.badge ? (
                                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-card" />
                            ) : null}
                        </Link>
                        <Link
                            aria-label="Account"
                            className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-xs font-black text-primary"
                            href="/account"
                        >
                            ME
                        </Link>
                    </div>
                </header>
                {trial ? (
                    <Link
                        className="block border-b bg-primary-soft px-5 py-2 text-center text-xs font-semibold text-primary hover:bg-primary-soft/70 xl:hidden"
                        href={trial.href}
                    >
                        <b>{trial.daysRemaining} days</b> remain in your trial <span aria-hidden="true">→</span>
                    </Link>
                ) : null}
                <div>{children}</div>
            </div>
            {mobileOpen ? (
                <div
                    aria-label="Business menu"
                    aria-modal="true"
                    className="fixed inset-0 z-[70] xl:hidden"
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') setMobileOpen(false);
                    }}
                    role="dialog"
                >
                    <button
                        aria-label="Close business menu"
                        className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
                        onClick={() => setMobileOpen(false)}
                        type="button"
                    />
                    <aside className="absolute inset-y-0 right-0 flex w-[min(90vw,22rem)] flex-col bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div className="min-w-0">
                                <p className="truncate font-bold">{businessName}</p>
                                <p className="text-xs text-muted-foreground">All tools</p>
                            </div>
                            <button
                                aria-label="Close business menu"
                                className="grid h-11 w-11 place-items-center rounded-xl border"
                                onClick={() => setMobileOpen(false)}
                                ref={closeRef}
                                type="button"
                            >
                                <Icon name="close" size={19} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 py-4">
                            <Navigation
                                base={base}
                                groups={groups}
                                onNavigate={() => setMobileOpen(false)}
                                pathname={pathname}
                                primaryItems={primaryItems}
                            />
                        </div>
                        <div className="border-t p-3">
                            <Link
                                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
                                href="/dashboard"
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon name="business" size={18} />
                                Switch business
                            </Link>
                            <Link
                                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
                                href="/account"
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon name="user" size={18} />
                                Account
                            </Link>
                        </div>
                    </aside>
                </div>
            ) : null}
            <nav
                aria-label="Mobile business navigation"
                className="pb-safe fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t bg-card/96 px-1 pt-1 backdrop-blur-xl xl:hidden"
            >
                <Link
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${activePath(pathname, base, base) ? 'text-primary' : 'text-muted-foreground'}`}
                    href={base}
                >
                    <Icon name="home" size={19} />
                    Home
                </Link>
                <button
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${dailyItems.some((item) => activePath(pathname, item.href, base)) ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setMobileOpen(true)}
                    type="button"
                >
                    <Icon name="sales" size={19} />
                    Daily work
                </button>
                {coach ? (
                    <Link
                        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${activePath(pathname, coach.href, base) ? 'text-primary' : 'text-muted-foreground'}`}
                        href={coach.href}
                    >
                        <Icon name="coach" size={19} />
                        Coach
                    </Link>
                ) : (
                    <span />
                )}
                {alerts ? (
                    <Link
                        className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${activePath(pathname, alerts.href, base) ? 'text-primary' : 'text-muted-foreground'}`}
                        href={alerts.href}
                    >
                        <Icon name="bell" size={19} />
                        {alerts.badge ? (
                            <span className="absolute right-[27%] top-2 h-2 w-2 rounded-full bg-accent" />
                        ) : null}
                        Alerts
                    </Link>
                ) : (
                    <span />
                )}
                <button
                    className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold text-muted-foreground"
                    onClick={() => setMobileOpen(true)}
                    type="button"
                >
                    <Icon name="menu" size={19} />
                    More
                </button>
            </nav>
        </div>
    );
}
