"use client";

import { IconSearch } from "@tabler/icons-react";
import type { FormEventHandler } from "react";
import { Field, FieldLabel } from "../components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../components/input-group";
import { cn } from "../lib/utils";

/**
 * Search block — `SearchField` (F-06).
 *
 * The query field for `/search`. Look follows the `@user` choice of
 * 2026-10-11 (*reuse the F-05 quiet Mintlify conventions*): the v4 `Field`
 * form family plus `InputGroup`, which is the composition the primitive's own
 * header names for a search field. Logged in `docs/design/now.md`.
 *
 * Two behaviour rules are not look choices:
 *
 * - **The field is a real form.** `method="get"` + `action` means Enter and the
 *   submit button work before hydration and with JavaScript off; the app owns
 *   routing (`@omnidoc/ui` has no routes, so the action comes in as a prop).
 * - **Only contract fields travel.** The field contributes exactly one query
 *   parameter, and `hiddenFields` exists so a no-JS submit carries the active
 *   corpus filter through as the real `corpusOwnership` request field, rather
 *   than silently dropping the filter the user chose.
 *
 * The input is controlled by the caller so as-you-type search can debounce
 * against the same value the user sees. `aria-busy` marks the form while a
 * search is in flight; the announced sentence comes from `SearchingNotice`
 * beside the results, so loading is announced once.
 */
export type SearchFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Called on submit. The caller decides between SPA and native navigation. */
  onSubmit?: FormEventHandler<HTMLFormElement>;
  /** `<label>` text — the accessible name of the field. */
  label?: string;
  placeholder?: string;
  name?: string;
  /** The search route. Defaults to nothing so the block owns no route. */
  action?: string;
  /** Query params that must survive a no-JS submit (e.g. the corpus filter). */
  hiddenFields?: Record<string, string>;
  /** True while a search is in flight. */
  busy?: boolean;
  submitLabel?: string;
  id?: string;
  className?: string;
};

export function SearchField({
  value,
  onValueChange,
  onSubmit,
  label = "Search your notes",
  placeholder = "Search this workspace",
  name = "q",
  action,
  hiddenFields,
  busy = false,
  submitLabel = "Search",
  id = "search-query",
  className,
}: SearchFieldProps) {
  const hidden = Object.entries(hiddenFields ?? {});

  return (
    <form
      role="search"
      method="get"
      action={action}
      aria-busy={busy}
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-2", className)}
    >
      <Field className="gap-1.5">
        <FieldLabel
          htmlFor={id}
          className="text-sm font-normal text-muted-foreground"
        >
          {label}
        </FieldLabel>
        <InputGroup className="h-9">
          <InputGroupAddon>
            <IconSearch aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id={id}
            name={name}
            type="search"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={placeholder}
            // Search terms are not a stored field: browsers must not offer to
            // save them or autofill an old query into the box.
            autoComplete="off"
            enterKeyHint="search"
          />
          <InputGroupButton type="submit">{submitLabel}</InputGroupButton>
        </InputGroup>
      </Field>
      {hidden.map(([fieldName, fieldValue]) => (
        <input
          key={fieldName}
          type="hidden"
          name={fieldName}
          value={fieldValue}
        />
      ))}
    </form>
  );
}
