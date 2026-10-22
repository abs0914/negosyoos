'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@negosyo-os/ui';

const slides = [
    {
        id: 'overview',
        label: 'Overview',
        icon: 'home',
        phoneTitle: 'Low stock check',
        phoneIcon: 'inventory',
        phoneItems: [
            ['Interior paint · White', '2 left'],
            ['Steel nails · 2 inch', '4 left'],
            ['PVC pipe · 1 inch', '0 left']
        ],
        phoneAction: 'Review inventory'
    },
    {
        id: 'inventory',
        label: 'Inventory',
        icon: 'inventory',
        phoneTitle: 'Receive stock',
        phoneIcon: 'inventory',
        phoneItems: [
            ['Boysen Permacoat', '+24 cans'],
            ['PVC elbow · 1 inch', '+40 pcs'],
            ['Marine plywood', '+12 sheets']
        ],
        phoneAction: 'Confirm receipt'
    },
    {
        id: 'customers',
        label: 'Customers',
        icon: 'customers',
        phoneTitle: 'Customer follow-up',
        phoneIcon: 'customers',
        phoneItems: [
            ['Maria Santos', 'Quotation viewed'],
            ['Ramon Builders', 'Invoice due tomorrow'],
            ['Cebu Homefix', 'Inactive for 30 days']
        ],
        phoneAction: 'Open follow-ups'
    },
    {
        id: 'cashflow',
        label: 'Cash flow',
        icon: 'wallet',
        phoneTitle: 'Record expense',
        phoneIcon: 'wallet',
        phoneItems: [
            ['Supplier payment', '₱18,400'],
            ['Delivery fuel', '₱2,150'],
            ['Internet service', '₱1,899']
        ],
        phoneAction: 'Add expense'
    },
    {
        id: 'team',
        label: 'Team operations',
        icon: 'team',
        phoneTitle: 'Pending approvals',
        phoneIcon: 'approvals',
        phoneItems: [
            ['Restock request', 'From Joel'],
            ['Expense request', '₱4,500'],
            ['Schedule change', 'From Mia']
        ],
        phoneAction: 'Review approvals'
    }
] as const;

type Metric = readonly [string, string, string, 'default' | 'warning' | 'success'];

function Metrics({ values }: { readonly values: readonly Metric[] }) {
    return (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-7 sm:grid-cols-4 sm:gap-3">
            {values.map(([label, value, detail, tone]) => (
                <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4" key={label}>
                    <p className="truncate text-[9px] font-semibold text-muted-foreground sm:text-xs">{label}</p>
                    <p className="mt-1 text-base font-bold tabular-nums sm:text-xl">{value}</p>
                    <p
                        className={`mt-1 text-[9px] font-bold sm:text-[10px] ${tone === 'warning' ? 'text-warning-foreground' : tone === 'success' ? 'text-success' : 'text-primary'}`}
                    >
                        {detail}
                    </p>
                </div>
            ))}
        </div>
    );
}

function ScreenHeading({
    eyebrow,
    title,
    description
}: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary sm:text-xs">{eyebrow}</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight sm:text-2xl">{title}</h2>
                <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{description}</p>
            </div>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary sm:h-10 sm:w-10">
                AS
            </span>
        </div>
    );
}

function AttentionCard({
    title,
    items
}: {
    readonly title: string;
    readonly items: readonly (readonly [string, string])[];
}) {
    return (
        <div className="hidden rounded-xl border bg-card p-5 sm:block">
            <p className="text-sm font-bold">{title}</p>
            <div className="mt-4 space-y-4">
                {items.map(([text, icon]) => (
                    <div className="flex gap-3" key={text}>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning-foreground">
                            <Icon name={icon} size={14} />
                        </span>
                        <p className="text-[11px] font-semibold leading-4">{text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function OverviewScreen() {
    const values = [
        ['Today’s sales', '₱28,450', '+12%', 'success'],
        ['Transactions', '43', 'today', 'default'],
        ['Receivables', '₱18,200', '3 due', 'default'],
        ['Low stock', '7 items', 'check now', 'warning']
    ] as const;
    return (
        <>
            <ScreenHeading
                eyebrow="Tuesday, today"
                title="Magandang umaga, Ana."
                description="Here is what needs your attention today."
            />
            <Metrics values={values} />
            <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-[1.35fr_.65fr]">
                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold sm:text-sm">Sales this week</p>
                        <span className="text-[9px] text-muted-foreground">Aug 24–30</span>
                    </div>
                    <div className="mt-5 flex h-24 items-end gap-2 sm:h-36 sm:gap-3">
                        {[38, 55, 44, 72, 65, 89, 78].map((height, index) => (
                            <span
                                className={`flex-1 rounded-t-md ${index === 5 ? 'bg-accent' : 'bg-primary/75'}`}
                                key={index}
                                style={{ height: `${height}%` }}
                            />
                        ))}
                    </div>
                    <div className="mt-2 flex justify-between text-[8px] font-semibold text-muted-foreground">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                        <span>Sun</span>
                    </div>
                </div>
                <AttentionCard
                    title="Needs attention"
                    items={[
                        ['7 items are low in stock', 'inventory'],
                        ['3 invoices are due soon', 'invoices'],
                        ['2 approvals are waiting', 'approvals']
                    ]}
                />
            </div>
        </>
    );
}

function InventoryScreen() {
    const values = [
        ['Stock value', '₱412,680', '520 items', 'default'],
        ['Low stock', '7', 'needs reorder', 'warning'],
        ['Out of stock', '2', 'urgent', 'warning'],
        ['Incoming', '4 POs', '₱86,200', 'success']
    ] as const;
    const rows = [
        ['Interior paint · White', '2', '12', 'Low'],
        ['PVC pipe · 1 inch', '0', '20', 'Out'],
        ['Marine plywood · 1/2', '18', '10', 'Healthy'],
        ['Steel nails · 2 inch', '4', '15', 'Low']
    ] as const;
    return (
        <>
            <ScreenHeading
                eyebrow="Inventory control"
                title="Know what to reorder next."
                description="Stock levels, incoming purchases, and attention items in one view."
            />
            <Metrics values={values} />
            <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-[1.35fr_.65fr]">
                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex items-center justify-between border-b p-4">
                        <p className="text-xs font-bold sm:text-sm">Stock attention</p>
                        <span className="text-[9px] font-bold text-primary">View inventory →</span>
                    </div>
                    <div className="divide-y">
                        {rows.map(([product, onHand, reorder, status]) => (
                            <div
                                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5"
                                key={product}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-[10px] font-bold sm:text-xs">{product}</p>
                                    <p className="text-[8px] text-muted-foreground">Reorder at {reorder}</p>
                                </div>
                                <b className="text-xs tabular-nums">{onHand}</b>
                                <span
                                    className={`rounded-full px-2 py-1 text-[8px] font-bold ${status === 'Healthy' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning-foreground'}`}
                                >
                                    {status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="hidden rounded-xl border bg-card p-5 sm:block">
                    <p className="text-sm font-bold">Stock by category</p>
                    <div className="mt-5 space-y-4">
                        {[
                            ['Paint & supplies', 78],
                            ['Hardware', 62],
                            ['Plumbing', 43],
                            ['Lumber', 71]
                        ].map(([label, value]) => (
                            <div key={label}>
                                <div className="flex justify-between text-[10px]">
                                    <b>{label}</b>
                                    <span>{value}%</span>
                                </div>
                                <div className="mt-1.5 h-2 rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

function CustomersScreen() {
    const values = [
        ['Active customers', '384', '+18 this month', 'success'],
        ['Returning', '64%', '+6 pts', 'success'],
        ['Open quotations', '12', '₱146,800', 'default'],
        ['Follow-ups', '9', '3 overdue', 'warning']
    ] as const;
    const rows = [
        ['Maria Santos', 'Walk-in retail', '₱12,480', 'Today'],
        ['Ramon Builders', 'Contractor', '₱86,300', 'Yesterday'],
        ['Cebu Homefix', 'Wholesale', '₱41,750', 'Aug 27'],
        ['Elena Cruz', 'Homeowner', '₱8,920', 'Aug 26']
    ] as const;
    return (
        <>
            <ScreenHeading
                eyebrow="Customer relationships"
                title="Follow every customer clearly."
                description="See recent activity, open opportunities, and who needs a follow-up."
            />
            <Metrics values={values} />
            <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-[1.35fr_.65fr]">
                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex items-center justify-between border-b p-4">
                        <p className="text-xs font-bold sm:text-sm">Recent customers</p>
                        <span className="text-[9px] font-bold text-primary">Add customer +</span>
                    </div>
                    <div className="divide-y">
                        {rows.map(([name, type, value, last]) => (
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5" key={name}>
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-[9px] font-black text-primary">
                                    {name
                                        .split(' ')
                                        .map((part) => part[0])
                                        .join('')}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-[10px] font-bold sm:text-xs">{name}</p>
                                    <p className="text-[8px] text-muted-foreground">
                                        {type} · {last}
                                    </p>
                                </div>
                                <b className="text-[10px] tabular-nums">{value}</b>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="hidden rounded-xl border bg-card p-5 sm:block">
                    <p className="text-sm font-bold">Customer mix</p>
                    <div className="mx-auto mt-5 grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(var(--primary)_0_64%,var(--accent)_64%_82%,var(--secondary)_82%)]">
                        <div className="grid h-16 w-16 place-items-center rounded-full bg-card text-center">
                            <div>
                                <b className="text-lg">384</b>
                                <span className="block text-[8px] text-muted-foreground">customers</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-center gap-3 text-[8px] font-semibold">
                        <span>● Retail 64%</span>
                        <span className="text-warning-foreground">● Trade 18%</span>
                    </div>
                </div>
            </div>
        </>
    );
}

function CashFlowScreen() {
    const values = [
        ['Cash in', '₱248,600', 'this month', 'success'],
        ['Cash out', '₱174,230', 'this month', 'default'],
        ['Net cash', '₱74,370', '+9%', 'success'],
        ['Receivables', '₱18,200', '3 due', 'warning']
    ] as const;
    return (
        <>
            <ScreenHeading
                eyebrow="Cash flow"
                title="See where the money is moving."
                description="Track cash coming in, expenses going out, and payments that need attention."
            />
            <Metrics values={values} />
            <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-[1.35fr_.65fr]">
                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold sm:text-sm">Inflow and outflow</p>
                        <span className="text-[9px] text-muted-foreground">Last 6 months</span>
                    </div>
                    <div className="mt-5 flex h-28 items-end justify-between gap-3 sm:h-36">
                        {[
                            [62, 42],
                            [73, 48],
                            [58, 51],
                            [81, 57],
                            [76, 54],
                            [91, 63]
                        ].map(([income, expense], index) => (
                            <div className="flex h-full flex-1 items-end justify-center gap-1" key={index}>
                                <span
                                    className="w-2.5 rounded-t-sm bg-primary sm:w-4"
                                    style={{ height: `${income}%` }}
                                />
                                <span
                                    className="w-2.5 rounded-t-sm bg-accent sm:w-4"
                                    style={{ height: `${expense}%` }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[8px] text-muted-foreground">
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>May</span>
                        <span>Jun</span>
                        <span>Jul</span>
                        <span>Aug</span>
                    </div>
                </div>
                <div className="hidden rounded-xl border bg-card p-5 sm:block">
                    <p className="text-sm font-bold">Upcoming payments</p>
                    <div className="mt-4 space-y-3">
                        {[
                            ['Supplier: Cebu Paint', '₱18,400', 'Tomorrow'],
                            ['Team payroll', '₱42,000', 'Sep 5'],
                            ['Warehouse rent', '₱25,000', 'Sep 7']
                        ].map(([label, value, date]) => (
                            <div className="rounded-lg bg-muted/55 p-3" key={label}>
                                <div className="flex justify-between gap-2 text-[10px]">
                                    <b>{label}</b>
                                    <b>{value}</b>
                                </div>
                                <p className="mt-1 text-[8px] text-muted-foreground">{date}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

function TeamScreen() {
    const values = [
        ['Present today', '8 / 10', '2 on leave', 'success'],
        ['Late arrivals', '1', '12 minutes', 'warning'],
        ['Pending approvals', '2', 'needs review', 'warning'],
        ['Open tasks', '6', '3 due today', 'default']
    ] as const;
    const rows = [
        ['Joel Garcia', 'Sales counter', 'In · 8:01 AM', 'On time'],
        ['Mia Reyes', 'Inventory', 'In · 7:54 AM', 'On time'],
        ['Carlo Lim', 'Delivery', 'In · 8:12 AM', 'Late'],
        ['Nina Flores', 'Cashier', 'In · 7:48 AM', 'On time']
    ] as const;
    return (
        <>
            <ScreenHeading
                eyebrow="Team operations"
                title="Keep today’s work moving."
                description="Attendance, assignments, and approvals without chasing updates in chat."
            />
            <Metrics values={values} />
            <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-[1.35fr_.65fr]">
                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex items-center justify-between border-b p-4">
                        <p className="text-xs font-bold sm:text-sm">Today’s attendance</p>
                        <span className="text-[9px] font-bold text-primary">Open timesheet →</span>
                    </div>
                    <div className="divide-y">
                        {rows.map(([name, role, time, status]) => (
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5" key={name}>
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-[9px] font-black text-primary">
                                    {name
                                        .split(' ')
                                        .map((part) => part[0])
                                        .join('')}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-[10px] font-bold sm:text-xs">{name}</p>
                                    <p className="text-[8px] text-muted-foreground">
                                        {role} · {time}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full px-2 py-1 text-[8px] font-bold ${status === 'Late' ? 'bg-warning-soft text-warning-foreground' : 'bg-success-soft text-success'}`}
                                >
                                    {status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <AttentionCard
                    title="Waiting for approval"
                    items={[
                        ['₱4,500 supplier expense', 'wallet'],
                        ['Restock 12 paint cans', 'inventory'],
                        ['Friday schedule change', 'team']
                    ]}
                />
            </div>
        </>
    );
}

const Screens = [OverviewScreen, InventoryScreen, CustomersScreen, CashFlowScreen, TeamScreen] as const;

export function LandingProductPreview() {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const pointerStart = useRef<number | null>(null);
    useEffect(() => {
        if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6500);
        return () => window.clearInterval(timer);
    }, [paused]);
    function move(direction: number) {
        setActive((current) => (current + direction + slides.length) % slides.length);
    }
    function focusTab(index: number) {
        setActive(index);
        window.requestAnimationFrame(() => document.getElementById(`preview-tab-${slides[index]?.id}`)?.focus());
    }
    function keyNavigation(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            focusTab((active + 1) % slides.length);
        }
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            focusTab((active - 1 + slides.length) % slides.length);
        }
        if (event.key === 'Home') {
            event.preventDefault();
            focusTab(0);
        }
        if (event.key === 'End') {
            event.preventDefault();
            focusTab(slides.length - 1);
        }
    }
    const current = slides[active] ?? slides[0];
    return (
        <div
            className="hero-enter hero-enter-delay-3 relative mx-auto mt-16 max-w-6xl px-2 sm:px-6 lg:mt-20"
            onBlurCapture={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onPointerDown={(event) => {
                pointerStart.current = event.clientX;
            }}
            onPointerUp={(event) => {
                if (pointerStart.current === null) return;
                const distance = event.clientX - pointerStart.current;
                if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
                pointerStart.current = null;
            }}
        >
            <div className="absolute -inset-x-16 bottom-0 top-1/3 rounded-[50%] bg-primary/15 blur-3xl" />
            <div className="relative">
                <div className="relative overflow-hidden rounded-[1.4rem] border border-white/80 bg-[#fdfcf8] p-2 shadow-[0_32px_90px_-38px_rgba(4,63,141,.46)] sm:rounded-[2rem] sm:p-3">
                    <div className="flex h-10 items-center gap-2 border-b px-3 sm:h-12 sm:px-5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#e06e5c]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                        <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                        <span className="ml-3 text-[10px] font-semibold text-muted-foreground sm:text-xs">
                            negosyoOS · Sampaguita Home Supply
                        </span>
                        <span aria-live="polite" className="ml-auto hidden text-[10px] font-bold text-primary sm:block">
                            {current.label}
                        </span>
                    </div>
                    <div className="grid min-h-[330px] grid-cols-[3.4rem_minmax(0,1fr)] bg-background sm:min-h-[480px] sm:grid-cols-[11rem_minmax(0,1fr)]">
                        <aside className="border-r bg-card p-2 sm:p-4">
                            <div className="mb-5 hidden items-center gap-2 text-sm font-bold sm:flex">
                                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-xs text-white">
                                    n
                                </span>{' '}
                                negosyoOS
                            </div>
                            <div className="space-y-2">
                                {slides.map((slide, index) => (
                                    <button
                                        aria-label={`Show ${slide.label} preview`}
                                        className={`flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left transition ${active === index ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                                        key={slide.id}
                                        onClick={() => setActive(index)}
                                        type="button"
                                    >
                                        <Icon name={slide.icon} size={15} />
                                        <span className="hidden text-[11px] font-semibold sm:inline">
                                            {slide.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </aside>
                        <div className="min-w-0 overflow-hidden">
                            <div
                                className="flex transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
                                style={{ transform: `translateX(-${active * 100}%)` }}
                            >
                                {Screens.map((Screen, index) => (
                                    <section
                                        aria-hidden={active !== index}
                                        aria-labelledby={`preview-tab-${slides[index]?.id}`}
                                        className="min-w-full p-4 sm:p-7"
                                        id={`preview-${slides[index]?.id}`}
                                        key={slides[index]?.id}
                                        role="tabpanel"
                                    >
                                        <Screen />
                                    </section>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 right-1 w-[38%] min-w-[142px] max-w-[270px] rounded-[2rem] border-[5px] border-[#20352a] bg-[#20352a] p-1.5 shadow-[0_28px_60px_-24px_rgba(18,44,28,.8)] sm:right-3 sm:border-[8px] sm:p-2">
                    <div className="overflow-hidden rounded-[1.45rem] bg-[#faf8f1] p-3 sm:rounded-[1.7rem] sm:p-5">
                        <div className="mx-auto h-1 w-10 rounded-full bg-[#20352a]/30" />
                        <div className="mt-5 flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-bold uppercase tracking-wide text-primary sm:text-[10px]">
                                    Quick task
                                </p>
                                <p className="mt-1 text-xs font-bold sm:text-base">{current.phoneTitle}</p>
                            </div>
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-warning-soft text-warning-foreground">
                                <Icon name={current.phoneIcon} size={13} />
                            </span>
                        </div>
                        <div className="mt-4 space-y-2">
                            {current.phoneItems.map(([name, detail]) => (
                                <div className="rounded-lg border bg-white p-2.5" key={name}>
                                    <p className="truncate text-[8px] font-bold sm:text-[10px]">{name}</p>
                                    <p className="mt-1 text-[7px] text-muted-foreground sm:text-[9px]">{detail}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 rounded-lg bg-primary py-2 text-center text-[8px] font-bold text-primary-foreground sm:text-[10px]">
                            {current.phoneAction}
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative z-20 mt-12 overflow-x-auto rounded-2xl border bg-card/95 p-1.5 shadow-card sm:mt-16">
                <div
                    aria-label="Product screen previews"
                    className="grid min-w-[620px] grid-cols-5 gap-1"
                    onKeyDown={keyNavigation}
                    role="tablist"
                >
                    {slides.map((slide, index) => (
                        <button
                            aria-controls={`preview-${slide.id}`}
                            aria-selected={active === index}
                            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition sm:text-sm ${active === index ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            id={`preview-tab-${slide.id}`}
                            key={slide.id}
                            onClick={() => setActive(index)}
                            role="tab"
                            tabIndex={active === index ? 0 : -1}
                            type="button"
                        >
                            <Icon name={slide.icon} size={16} />
                            {slide.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="relative z-20 mt-3 flex items-center justify-center gap-3">
                <button
                    aria-label="Previous product screen"
                    className="grid h-10 w-10 place-items-center rounded-full border bg-card text-muted-foreground hover:text-primary"
                    onClick={() => move(-1)}
                    type="button"
                >
                    <Icon name="chevron-left" size={16} />
                </button>
                <div aria-hidden="true" className="flex gap-1.5">
                    {slides.map((slide, index) => (
                        <span
                            className={`h-1.5 rounded-full transition-all ${active === index ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`}
                            key={slide.id}
                        />
                    ))}
                </div>
                <button
                    aria-label="Next product screen"
                    className="grid h-10 w-10 place-items-center rounded-full border bg-card text-muted-foreground hover:text-primary"
                    onClick={() => move(1)}
                    type="button"
                >
                    <Icon name="chevron-right" size={16} />
                </button>
            </div>
            <div className="pointer-events-none absolute -bottom-12 inset-x-0 h-24 bg-gradient-to-t from-background via-background/85 to-transparent" />
        </div>
    );
}
