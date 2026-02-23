import * as React from "react";

import { cn } from "@/lib/utils";

type TableProps = Readonly<React.TableHTMLAttributes<HTMLTableElement>>;
type TableSectionProps = Readonly<React.HTMLAttributes<HTMLTableSectionElement>>;
type TableRowProps = Readonly<React.HTMLAttributes<HTMLTableRowElement>>;
type TableHeaderCellProps = Readonly<React.ThHTMLAttributes<HTMLTableCellElement>>;
type TableCellProps = Readonly<React.TdHTMLAttributes<HTMLTableCellElement>>;

export function Table({
  className,
  ...props
}: TableProps) {
  return <table className={cn("w-full text-sm", className)} {...props} />;
}

export function TableHeader({
  className,
  ...props
}: TableSectionProps) {
  return <thead className={cn("text-xs uppercase tracking-[0.14em] text-muted", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: TableSectionProps) {
  return <tbody className={cn(className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: TableRowProps) {
  return <tr className={cn("border-b border-white/5", className)} {...props} />;
}

export function TableHeadCell({
  className,
  ...props
}: TableHeaderCellProps) {
  return <th className={cn("px-3 py-3 text-left font-semibold", className)} {...props} />;
}

export function TableCell({
  className,
  ...props
}: TableCellProps) {
  return <td className={cn("px-3 py-3 align-middle", className)} {...props} />;
}
