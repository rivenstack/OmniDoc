"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconDeviceDesktop,
  IconDots,
  IconInfoCircle,
  IconMoon,
  IconNotes,
  IconPlus,
  IconSearch,
  IconSun,
} from "@tabler/icons-react";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  IconButton,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Separator,
  Skeleton,
  Spinner,
  Textarea,
} from "@omnidoc/ui";

const themes = [
  { value: "light", label: "Light theme", icon: IconSun },
  { value: "dark", label: "Dark theme", icon: IconMoon },
  { value: "system", label: "System theme", icon: IconDeviceDesktop },
] as const;

/**
 * Visible UI kit (F-02a, remade 2026-09-23).
 *
 * Stock shadcn v4 `base-nova` components on Base UI, skinned with the
 * Mintlify design language (tokens only — no component forks for looks).
 * Not an app shell and not a product screen.
 */
export function KitGallery() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Mintlify design language · shadcn v4 base-nova on Base UI · Tabler
          icons
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-od-display">UI kit</h1>
          <div className="flex gap-2" role="group" aria-label="Theme">
            {themes.map(({ value, label, icon: Icon }) => (
              <IconButton
                key={value}
                label={label}
                variant={mounted && theme === value ? "default" : "outline"}
                pressed={mounted && theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon aria-hidden="true" />
              </IconButton>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Primitives only. Not an app shell and not a product screen.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-od-h2">Buttons</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button>New note</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
          <Button disabled>
            <Spinner data-icon="inline-start" />
            Saving
          </Button>
          <Button>
            <IconPlus data-icon="inline-start" aria-hidden="true" />
            New note
          </Button>
          <Button variant="outline">
            Open
            <IconArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
          <IconButton label="Search">
            <IconSearch aria-hidden="true" />
          </IconButton>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-od-h2">Fields</h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="kit-title">Title</FieldLabel>
            <Input id="kit-title" placeholder="Untitled" />
            <FieldDescription>Shown in the notes list.</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="kit-slug">Slug</FieldLabel>
            <Input
              id="kit-slug"
              defaultValue="weekly review"
              aria-invalid
            />
            <FieldError>Use lowercase letters and dashes only.</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="kit-body">Body</FieldLabel>
            <Textarea id="kit-body" placeholder="Write something…" />
          </Field>
          <Field>
            <FieldLabel htmlFor="kit-search">Search</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <IconSearch aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput id="kit-search" placeholder="Search notes" />
              <InputGroupButton aria-label="Run search">
                <IconArrowRight aria-hidden="true" />
              </InputGroupButton>
            </InputGroup>
            <FieldDescription>
              Search is its own operation, separate from Ask.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-od-h2">Badges</h2>
        <p className="text-sm text-muted-foreground">
          Always icon + text — never colour alone.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            <IconNotes aria-hidden="true" />
            Draft
          </Badge>
          <Badge variant="outline">
            <IconClock aria-hidden="true" />
            Pending
          </Badge>
          <Badge variant="info">
            <IconInfoCircle aria-hidden="true" />
            Indexing
          </Badge>
          <Badge variant="success">
            <IconCheck aria-hidden="true" />
            Ready
          </Badge>
          <Badge variant="warning">
            <IconAlertTriangle aria-hidden="true" />
            Partial index
          </Badge>
          <Badge variant="destructive">
            <IconAlertTriangle aria-hidden="true" />
            Failed
          </Badge>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-od-h2">Card</h2>
        <Card>
          <CardHeader>
            <CardTitle>Weekly review</CardTitle>
            <CardDescription>
              Three notes mention the pricing test.
            </CardDescription>
            <CardAction>
              <IconButton label="Note actions" size="icon-sm">
                <IconDots aria-hidden="true" />
              </IconButton>
            </CardAction>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <Spinner label="Indexing notes" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Open</Button>
            <Button size="sm" variant="ghost">
              Dismiss
            </Button>
          </CardFooter>
        </Card>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-od-h2">Empty state</h2>
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconNotes aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No notes yet</EmptyTitle>
            <EmptyDescription>
              Capture a thought and it lands in your Inbox.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">
              <IconPlus data-icon="inline-start" aria-hidden="true" />
              New note
            </Button>
          </EmptyContent>
        </Empty>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-od-h2">Reading &amp; identifiers</h2>
        <p className="od-reading-measure text-sm leading-relaxed text-muted-foreground">
          Answer prose caps at the reading measure. A citation points at a
          note, a version and a chunk — never at a passage the server did not
          return.
        </p>
        <p className="text-sm text-muted-foreground">
          Workspace{" "}
          <bdi className="od-isolate font-medium text-foreground">
            Northwind &amp; Co.
          </bdi>{" "}
          · chunk <bdi className="od-isolate od-tabular">0198f2c1</bdi>
        </p>
        <div className="flex items-center gap-3">
          <Spinner label="Loading notes" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </section>
    </div>
  );
}
