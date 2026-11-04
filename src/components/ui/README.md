# ResQ UI Component System (Direction 3: Modern Minimalist Fleet Orchestration)

This directory contains the core UI primitives and design system components for **ResQ**, built with React 19, Radix UI primitives, Tailwind CSS v4, and Lucide icons.

The design system strictly adheres to **Direction 3: Modern Minimalist Fleet Orchestration**:
- **Palette**: Low-saturation dark canvas with high-contrast functional accents and an equally refined light theme.
- **Typography**: Inter for UI prose, JetBrains Mono for telemetry, metrics, and timestamps.
- **Tabular Numbers**: `.tnum` / `tabular-nums` on all coordinates, countdowns, timestamps, and fleet metrics to prevent jitter during live updates.
- **Motion**: Restrained 150ms transitions (`ease-out`), strictly respecting `prefers-reduced-motion`.
- **Zero dynamic Tailwind classes**: All semantic and dynamic states use static lookup tables to prevent missing styles in production builds.
- **Accessibility**: Minimum text size is 12px (11px allowed only for uppercase tracking badges/captions), contrast ratios meet WCAG AA (≥ 4.5:1), and mobile touch targets measure ≥ 44px.

---

## 1. Tokens & Theme Foundation

### Theme Provider (`ThemeProvider`)
Located in `@/components/providers/ThemeProvider.tsx`. Supports `"dark"`, `"light"`, and `"system"` modes. Synchronizes with `localStorage` (`resq-theme`) and updates `<html class="dark | light">`.

An inline head script in `src/routes/__root.tsx` prevents Flash of Unstyled Content (FOUC) during initial SSR load.

```tsx
import { useTheme } from "@/components/providers/ThemeProvider";

function ThemeController() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      Toggle theme (current: {theme})
    </button>
  );
}
```

### Theme Toggle (`ThemeToggle`)
Located in `@/components/ui/theme-toggle.tsx`.
- **Single Icon Mode**: Toggles dark/light with a subtle animated icon.
- **Segmented Mode**: Displays `System | Light | Dark` segmented controls.

```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Standard icon button in header:
<ThemeToggle />

// Segmented group in Settings or Admin console:
<ThemeToggle variant="segmented" size="sm" />
```

---

## 2. Component Catalog & Usage Guide

### Button (`button.tsx`)
Comprehensive button variants tailored for emergency services, dispatch actions, and secondary workflows.

| Variant | Purpose | Visual Styling |
|---|---|---|
| `primary` | Main interface actions | Cyan `#38BDF8` with dark contrast text |
| `emergency` | Critical triage & emergency dispatches | Vivid Crimson `#EF4444` with white text |
| `secondary` | Supporting secondary actions | `surface-2` with subtle border and hover feedback |
| `outline` | Low-emphasis secondary actions | Transparent with `border-border` |
| `ghost` | Toolbar & contextual actions | Transparent, subtle hover tint |
| `destructive` | Irreversible deletion/cancellation | Destructive red border & red tint |

**Sizes**:
- `sm`: 28px height (compact toolbars, tables)
- `md`: 36px height (standard desktop forms and toolbars)
- `lg`: 48px height (primary dashboard call-to-actions, driver confirmation)
- `xl`: 56px height (citizen 1-tap SOS trigger, driver in-vehicle mission accepts)
- `icon-sm`, `icon-md`, `icon-lg`: Square icon buttons

```tsx
import { Button } from "@/components/ui/button";
import { PhoneCall, Check } from "lucide-react";

// Primary emergency action (Driver accept / Dispatch initiate)
<Button variant="emergency" size="xl" className="w-full">
  <PhoneCall className="h-6 w-6" />
  ACCEPT MISSION
</Button>

// Standard secondary action
<Button variant="secondary" size="md">
  Export GeoJSON
</Button>
```

---

### Badge, PriorityBadge & StatusBadge (`badge.tsx`)
Provides static, type-safe badge styling with zero dynamic class string concatenation.

```tsx
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";

// General badge
<Badge variant="outline">Telemetry Live</Badge>

// Triage priority badge (accepts: "p1" | "p2" | "p3" | "p4" | "critical" | "urgent" | "moderate" | "low")
<PriorityBadge priority="p1" showDot />
<PriorityBadge priority="p2" size="sm" />

// Fleet & Incident status badge (accepts: "available" | "en_route" | "busy" | "hospital" | "offline" | "maintenance")
<StatusBadge status="en_route" showDot pulse />
<StatusBadge status="available" />
```

---

### StatusDot (`status-dot.tsx`)
A minimal, accessible indicator for telemetry connectivity, vehicle status, and priority pulses.

```tsx
import { StatusDot } from "@/components/ui/status-dot";

// Static status dot
<StatusDot status="available" size="md" />

// En-route pulsing indicator for live dispatch
<StatusDot status="en_route" size="lg" pulse />

// Priority 1 critical alarm dot
<StatusDot priority="p1" pulse />
```

---

### MetricCard (`metric-card.tsx`)
A unified KPI widget replacing ad-hoc stats containers. Displays large tabular values, labels, trend indicators, and optional icon badges.

```tsx
import { MetricCard } from "@/components/ui/metric-card";
import { Clock, ShieldAlert } from "lucide-react";

// Standard card format
<MetricCard
  label="Avg Response Time"
  value="04:12"
  unit="min"
  icon={<Clock className="h-4 w-4" />}
  trend={{ direction: "down", label: "-18s vs target", positive: true }}
/>

// Compact strip metric
<MetricCard
  variant="compact"
  label="Active P1 Units"
  value={8}
  icon={<ShieldAlert className="h-4 w-4 text-[var(--color-p1)]" />}
/>

// Minimal chip metric
<MetricCard
  variant="chip"
  label="Fleet Online"
  value="94%"
/>
```

---

### Field & Form Controls (`field.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `label.tsx`)
Ensures accessible HTML linking between labels and form controls, error live-regions, and consistent surface styling.

```tsx
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

<Field
  label="Incident Location"
  required
  hint="Enter street name or landmark nearest to the patient"
  error={errors.location?.message}
>
  <Input placeholder="e.g. 104 Main Street, Gate 3" />
</Field>

<Field label="Triage Notes">
  <Textarea placeholder="Report patient symptoms, conscious status, and hazards..." rows={3} />
</Field>
```

---

### Table, TableSortHeader & TablePagination (`table.tsx`)
Accessible tabular data presentation with monospace numbers, sticky header support, interactive sorting headers, and pagination controls.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableSortHeader,
  TablePagination,
  TableEmpty,
} from "@/components/ui/table";

<div className="rounded-lg border border-border bg-card">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>
          <TableSortHeader
            title="Unit ID"
            sorted={sortField === "id" ? sortDirection : false}
            onToggleSort={() => handleSort("id")}
          />
        </TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">ETA</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {units.length === 0 ? (
        <TableEmpty colSpan={3} message="No active ambulances matching filter" />
      ) : (
        units.map((unit) => (
          <TableRow key={unit.id}>
            <TableCell className="font-mono text-xs">{unit.id}</TableCell>
            <TableCell><StatusBadge status={unit.status} /></TableCell>
            <TableCell className="text-right tnum font-mono">{unit.eta}</TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
  <TablePagination
    currentPage={page}
    totalPages={totalPages}
    totalItems={totalItems}
    pageSize={pageSize}
    onPageChange={setPage}
  />
</div>
```

---

### Tabs (`tabs.tsx`)
Keyboard-navigable tabs using `bg-surface-2` with active elevation on `bg-card` or `bg-surface-3`.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="incidents">
  <TabsList>
    <TabsTrigger value="incidents">Incidents (12)</TabsTrigger>
    <TabsTrigger value="fleet">Fleet (24)</TabsTrigger>
    <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
  </TabsList>
  <TabsContent value="incidents">...</TabsContent>
  <TabsContent value="fleet">...</TabsContent>
  <TabsContent value="hospitals">...</TabsContent>
</Tabs>
```

---

### Dialog, Sheet & Drawer (`dialog.tsx`, `sheet.tsx`, `drawer.tsx`)
Overlay primitives with backdrop blur, keyboard trapping, and consistent z-indices (`z-[200]` backdrop, `z-[210]` modal content) so maps never clip modal dialogues.

- **Dialog**: Centered modals for desktop workflows (unit reassignment, confirm cancel).
- **Sheet**: Edge-anchored drawer panels (incident details panel, fleet inspector).
- **Drawer**: Bottom sheet optimized for mobile viewports (Citizen & Driver portals).

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Reassign Unit AMB-04</DialogTitle>
      <DialogDescription>
        Reassigning will cancel the existing dispatch path and alert driver in real-time.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button variant="emergency" onClick={handleReassign}>
        Confirm Reassignment
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Alert (`alert.tsx`)
Status banners for triage alerts, connection status, and operational warnings.

Variants: `default`, `destructive` (P1 red), `warning` (P2 orange), `success` (available green), `info` (cyan primary).

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Severe Weather Alert</AlertTitle>
  <AlertDescription>
    Heavy rainfall in Sector 4 is increasing average transit times by +6 minutes.
  </AlertDescription>
</Alert>
```

---

### Skeleton & SkeletonList (`skeleton.tsx`, `skeleton-list.tsx`)
Neutral pulse placeholders for perceived performance. Uses `bg-surface-3` with restrained opacity transitions.

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonList } from "@/components/ui/skeleton-list";

// Individual skeleton
<Skeleton className="h-10 w-full" />

// Full list placeholder during queries
<SkeletonList count={5} itemHeight="h-16" />
```

---

### EmptyState (`empty-state.tsx`)
Consistent feedback when lists, queues, or telemetry streams have no items.

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

<EmptyState
  message="No Active Incidents"
  description="All reported triage tickets have been resolved or handed over to hospital triage."
  action={
    <Button variant="secondary" size="sm">
      <Plus className="h-3.5 w-3.5" />
      Create Manual Incident
    </Button>
  }
/>
```

---

### ErrorState (`error-state.tsx`)
Categorized error recovery panels distinguishing between:
- `"403"`: Access Restricted / Permission Denied
- `"500"`: Service Unavailable / Server Crash
- `"offline"`: Disconnected from dispatch telemetry socket
- `"generic"`: Unexpected UI exception

```tsx
import { ErrorState } from "@/components/ui/error-state";

// Network offline error
<ErrorState
  type="offline"
  onRetry={() => reconnectSocket()}
/>

// Permission error
<ErrorState
  type="403"
  title="Dispatcher Clearance Required"
  message="Your account lacks permissions to issue live fleet overrides."
/>

// API query error with retry
<ErrorState
  type="500"
  message="Failed to load incident registry"
  onRetry={() => refetch()}
/>
```

---

## 3. Engineering Guidelines & Constraints

1. **Tabular Numerals**: Always apply `.tnum` or `font-mono` when displaying timestamps, coordinates, speeds, distances, and counts.
2. **Never Generate Dynamic Tailwind Classes**:
   ```tsx
   // ❌ Broken in Tailwind v4:
   <div className={`bg-${priority}-500`} />

   // ✅ Correct: Use static lookup records or dedicated components:
   <PriorityBadge priority={priority} />
   ```
3. **Contrast Enforcement**: Text colors should use `text-foreground` or `text-muted-foreground`. Muted foreground has been calibrated in `src/styles.css` to maintain ≥ 4.5:1 contrast against `bg-canvas`, `bg-surface`, and `bg-card`.
4. **Touch Target Sizes**: On mobile, Citizen, and Driver consoles, interactive elements must be minimum 44px height (`size="lg"` or `size="xl"` on `Button`).
5. **No Decorative Gradients or Gimmick Glows**: Keep operational views clean and high-utility to reduce visual fatigue during extended dispatch shifts.
