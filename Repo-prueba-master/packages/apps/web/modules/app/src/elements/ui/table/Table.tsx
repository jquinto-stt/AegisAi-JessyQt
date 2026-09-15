import { ReactNode } from "react";

/**
 * Props for the **Table** component.
 * @kgId 50d7e4a2d152
 */
export interface TableProps {
  /**
   * Table content — composed with `TableHeader`, `TableBody`,
   * `TableRow`, and `TableCell` subcomponents.
   *
   * @example
   * ```tsx
   * <Table>
   *   <TableHeader>
   *     <TableRow>
   *       <TableCell header>Name</TableCell>
   *       <TableCell header>Position</TableCell>
   *       <TableCell header>Office</TableCell>
   *     </TableRow>
   *   </TableHeader>
   *   <TableBody>
   *     <TableRow>
   *       <TableCell>Alice</TableCell>
   *       <TableCell>Engineer</TableCell>
   *       <TableCell>NYC</TableCell>
   *     </TableRow>
   *   </TableBody>
   * </Table>
   * ```
   */
  children: ReactNode;

  /**
   * Additional CSS classes for the `<table>` element.
   *
   * @default `""`
   */
  className?: string;
}

/**
 * Table — Structured container for presenting tabular data with
 * support for rich cell content.
 *
 * A thin wrapper over native HTML `<table>` inside a horizontally
 * scrollable container. The canonical form shows the simplest case:
 * columns (name, position, office) with plain text rows. The real
 * power comes from composing rich content inside cells.
 *
 * @remarks
 * **When to use Table vs related components:**
 * - Use `Table` for structured data with columns and rows —
 *   user lists, transaction logs, product inventories.
 * - Use **Card** for free-form grouped content without columns.
 * - Use **List** for simple vertical sequences without tabular structure.
 *
 * **Composition:**
 * - `TableHeader` — `<thead>` with gray background for column labels.
 * - `TableBody` — `<tbody>` container for data rows.
 * - `TableRow` — `<tr>` with bottom border between rows.
 * - `TableCell` — `<td>` or `<th>` (via `header` prop). Each cell
 *   accepts any `ReactNode`, enabling rich composition.
 *
 * **Rich cell patterns (composition):**
 * - **Badge** inside cells for categorized status (Active, Pending, etc.)
 * - **Checkbox** for multi-row selection
 * - **Avatar** for person identification in user tables
 * - **Button** or inline actions for per-row operations (edit, delete)
 * - **Dropdown** for secondary actions that don't need to be always visible
 *
 * **Style variations:**
 * - Header with background — adds visual contrast to the header row
 *   for easier scanning in dense tables.
 * - Bordered cells — explicit borders between cells, useful in
 *   high-density tables or formal contexts.
 *
 * **Limitations:**
 * - Primitive wrapper — no built-in sort, filter, or pagination.
 *   See `TECH_DEBT.md` (Table - Componente primitivo).
 * - Does not use `cn()` for class merging — uses string concatenation.
 * - No `striped` or `hoverable` props — style via `className` on rows.
 *
 * @example Basic table
 * ```tsx
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableCell header>Name</TableCell>
 *       <TableCell header>Status</TableCell>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>Project Alpha</TableCell>
 *       <TableCell><Badge color="success">Active</Badge></TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * ```
 *
 * @example With avatar, checkbox, and row actions
 * ```tsx
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableCell header><Checkbox /></TableCell>
 *       <TableCell header>User</TableCell>
 *       <TableCell header>Role</TableCell>
 *       <TableCell header>Actions</TableCell>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell><Checkbox /></TableCell>
 *       <TableCell>
 *         <div className="flex items-center gap-3">
 *           <Avatar src="/img/user.jpg" size="small" />
 *           <span>Alice Johnson</span>
 *         </div>
 *       </TableCell>
 *       <TableCell><Badge color="info">Admin</Badge></TableCell>
 *       <TableCell>
 *         <Dropdown isOpen={open} onClose={close}>
 *           <DropdownItem>Edit</DropdownItem>
 *           <DropdownItem>Delete</DropdownItem>
 *         </Dropdown>
 *       </TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * ```
 *
 * @see {@link TableHeader} — Table head section (`<thead>`).
 * @see {@link TableBody} — Table body section (`<tbody>`).
 * @see {@link TableRow} — Table row (`<tr>`).
 * @see {@link TableCell} — Table cell (`<td>` or `<th>`).
 * @see {@link Card} — For free-form content grouping.
 * @see {@link List} — For simple vertical sequences.
 * @kgId 4a6d9ec544b7
 */
const Table: React.FC<TableProps> = ({ children, className = "" }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${className}`}>{children}</table>
    </div>
  );
};

export default Table;
