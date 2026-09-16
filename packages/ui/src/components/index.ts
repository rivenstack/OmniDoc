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
 * DropdownMenu, Tabs, Avatar, ScrollArea, Checkbox, RadioGroup, Switch,
 * PasswordInput, FieldHint, Kbd) are added by the F-* slices that first need
 * them, through the same copy-in path configured by `components.json`.
 */
export { Button, buttonVariants, type ButtonProps } from "./button";
export { IconButton, type IconButtonProps } from "./icon-button";
export { Input } from "./input";
export { Textarea, type TextareaProps } from "./textarea";
export { Label, type LabelProps } from "./label";
export { Badge, badgeVariants, type BadgeProps } from "./badge";
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
