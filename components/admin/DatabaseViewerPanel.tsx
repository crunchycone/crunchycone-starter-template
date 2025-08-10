"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { getDatabaseTables, getTableData } from "@/app/actions/admin";
import type { DatabaseTable, TableData } from "@/app/actions/admin";

export function DatabaseViewerPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTable = searchParams.get("table");
  const currentPage = parseInt(searchParams.get("page") || "1");
  const sortColumn = searchParams.get("sortBy");
  const sortDirection = (searchParams.get("sortDir") || "asc") as "asc" | "desc";
  const itemsPerPage = 100;

  // Load tables on mount
  useEffect(() => {
    loadTables();
  }, []);

  // Load table data when URL params change
  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable, currentPage, sortColumn, sortDirection);
    } else {
      setTableData(null);
    }
  }, [selectedTable, currentPage, sortColumn, sortDirection]);

  const loadTables = async () => {
    try {
      setLoading(true);
      setError(null);
      const tablesData = await getDatabaseTables();
      setTables(tablesData);
    } catch (err) {
      setError("Failed to load database tables");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (
    tableName: string,
    page: number = 1,
    sortCol: string | null,
    sortDir: "asc" | "desc"
  ) => {
    try {
      setTableLoading(true);
      setError(null);
      const data = await getTableData(tableName, page, itemsPerPage, sortCol || undefined, sortDir);
      setTableData(data);
    } catch (err) {
      setError(`Failed to load data from table: ${tableName}`);
      console.error(err);
    } finally {
      setTableLoading(false);
    }
  };

  const handleTableClick = (tableName: string) => {
    router.push(`/admin/database?table=${encodeURIComponent(tableName)}&page=1`);
  };

  const handleBackToTables = () => {
    router.push("/admin/database");
  };

  const handlePreviousPage = () => {
    if (currentPage > 1 && selectedTable) {
      const params = new URLSearchParams();
      params.set("table", selectedTable);
      params.set("page", String(currentPage - 1));
      if (sortColumn) {
        params.set("sortBy", sortColumn);
        params.set("sortDir", sortDirection);
      }
      router.push(`/admin/database?${params.toString()}`);
    }
  };

  const handleNextPage = () => {
    if (
      tableData &&
      currentPage < Math.ceil(tableData.totalCount / itemsPerPage) &&
      selectedTable
    ) {
      const params = new URLSearchParams();
      params.set("table", selectedTable);
      params.set("page", String(currentPage + 1));
      if (sortColumn) {
        params.set("sortBy", sortColumn);
        params.set("sortDir", sortDirection);
      }
      router.push(`/admin/database?${params.toString()}`);
    }
  };

  const handleSort = (column: string) => {
    if (!selectedTable) return;

    const params = new URLSearchParams();
    params.set("table", selectedTable);
    params.set("page", "1"); // Reset to page 1 when sorting changes

    if (sortColumn === column) {
      // Same column clicked
      if (sortDirection === "asc") {
        params.set("sortBy", column);
        params.set("sortDir", "desc");
      } else {
        // Remove sorting (third click)
        // Don't set sortBy or sortDir to remove them
      }
    } else {
      // Different column clicked
      params.set("sortBy", column);
      params.set("sortDir", "asc");
    }

    router.push(`/admin/database?${params.toString()}`);
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const formatCellValue = (value: unknown): string => {
    if (value === null) return "NULL";
    if (value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading database tables...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Show table list view
  if (!selectedTable) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Database Tables</h3>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
                <TableHead className="text-right">Rows</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow
                  key={table.name}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleTableClick(table.name)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-muted-foreground" />
                      {table.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{table.rowCount}</TableCell>
                </TableRow>
              ))}
              {tables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No tables found in the database
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Show table data view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBackToTables}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Tables
          </Button>
          <h3 className="text-lg font-semibold">{selectedTable}</h3>
          {tableData && <Badge variant="secondary">{tableData.totalCount} total rows</Badge>}
        </div>
      </div>

      {tableLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading table data...</span>
        </div>
      ) : tableData ? (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableData.columns.map((column) => (
                    <TableHead key={column} className="font-semibold">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort(column)}
                      >
                        <span className="flex items-center gap-1">
                          {column}
                          {getSortIcon(column)}
                        </span>
                      </Button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.rows.length > 0 ? (
                  tableData.rows.map((row, index) => (
                    <TableRow key={index}>
                      {tableData.columns.map((column) => (
                        <TableCell key={column} className="max-w-xs truncate">
                          <span className="font-mono text-sm">{formatCellValue(row[column])}</span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={tableData.columns.length}
                      className="text-center text-muted-foreground"
                    >
                      No data found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {tableData.totalCount > itemsPerPage && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, tableData.totalCount)} of{" "}
                {tableData.totalCount} rows
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {Math.ceil(tableData.totalCount / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= Math.ceil(tableData.totalCount / itemsPerPage)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
