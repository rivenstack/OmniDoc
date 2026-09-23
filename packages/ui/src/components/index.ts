/**
 * Foundations / primitives barrel — shadcn v4 (`base-nova`, Base UI).
 *
 * Copied-in shadcn / Base UI components are project-owned in `packages/ui`
 * (ADR-0002/0003). They consume semantic tokens only and never import a
 * provider SDK, Spring/Java types, or `packages/mocks` production paths
 * (enforced by `@nx/enforce-module-boundaries`).
 *
 * The foundation tier is Button/IconButton, Input/Textarea/Label, the Field
 * form family, InputGroup, Badge, Card, Separator, Skeleton, Spinner, and
 * Empty. The remaining shadcn components (Select, Dialog, Sheet, Tooltip,
 * DropdownMenu, Tabs, Avatar, …) are added by the F-* slices that first need
 * them, through the same copy-in path configured by `components.json`.
 */
export { Button, buttonVariants, type ButtonProps } from "./button";
export { IconButton, type IconButtonProps } from "./icon-button";
export { Input } from "./input";
export { Textarea } from "./textarea";
export { Label } from "./label";
export { Badge, badgeVariants, type BadgeProps } from "./badge";
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
export { Separator } from "./separator";
export { Skeleton } from "./skeleton";
export { Spinner } from "./spinner";
export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field";
export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./input-group";
export {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";
