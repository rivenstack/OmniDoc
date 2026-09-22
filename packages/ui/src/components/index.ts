/**
 * Foundations / primitives barrel — D-01 component inventory §3.
 *
 * Copied-in shadcn / Base UI components are project-owned in `packages/ui`
 * (ADR-0002/0003). They consume D-01 semantic tokens only and never import a
 * provider SDK, Spring/Java types, or `packages/mocks` production paths
 * (inventory §13; enforced by `@nx/enforce-module-boundaries`).
 *
 * F-01 lands the foundation tier these compose on. The remaining §3 rows
 * (Select, Combobox, Popover, Tooltip, Sheet, Dialog, AlertDialog,
 * DropdownMenu, Tabs, ScrollArea, Checkbox, RadioGroup, Switch,
 * PasswordInput, FieldHint, Kbd) are added by the F-* slices that first need
 * them, through the same copy-in path configured by `components.json`.
 * F-02 added `Avatar` for the workspace switcher and members panel; `Tooltip`,
 * `Menu`, and `Dialog` are consumed directly inside the §1–§2 shell components
 * rather than as additional §3 rows.
 */
export { Button, buttonVariants, type ButtonProps } from "./button";
export { IconButton, type IconButtonProps } from "./icon-button";
export { Input } from "./input";
export { Textarea, type TextareaProps } from "./textarea";
export { Label, type LabelProps } from "./label";
export { Badge, badgeVariants, type BadgeProps } from "./badge";
export { Avatar, initialsOf, type AvatarProps } from "./avatar";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardProps,
} from "./card";
export { Separator, type SeparatorProps } from "./separator";
export { Skeleton } from "./skeleton";
export { Spinner, type SpinnerProps } from "./spinner";

// D-01 inventory §1–§2 shell + workspace chrome (F-02), plus the one §3 row
// those slices first needed (`Avatar`).
export * from "./shell";
