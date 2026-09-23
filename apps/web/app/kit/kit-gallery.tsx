"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  IconButton,
  Input,
  Label,
  Separator,
  Skeleton,
  Spinner,
  Textarea,
} from "@omnidoc/ui";

const themes = ["light", "dark", "system"] as const;

export function KitGallery() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Stock primitives</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">UI kit</h1>
          <div className="flex gap-2" role="group" aria-label="Theme">
            {themes.map((value) => (
              <Button
                key={value}
                size="sm"
                variant={mounted && theme === value ? "default" : "outline"}
                onClick={() => setTheme(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Existing shadcn primitives only. Not an app shell and not a product
          screen.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <IconButton label="Toggle theme icon" variant="outline">
            {mounted && theme === "dark" ? <Moon /> : <Sun />}
          </IconButton>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Fields</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="kit-note">Note title</Label>
          <Input id="kit-note" placeholder="Untitled" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="kit-body">Body</Label>
          <Textarea id="kit-body" placeholder="Write something" />
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Card</h2>
        <Card>
          <CardHeader>
            <CardTitle>Sample card</CardTitle>
            <CardDescription>A surface, not a feature.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <Spinner label="Loading" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
