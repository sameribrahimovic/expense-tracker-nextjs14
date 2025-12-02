"use client";

import { useState, useEffect } from "react";
import { UserSettings } from "@prisma/client";
import { GetTransactions } from "../../_actions/transactions";
import { Transaction } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { GetFormatterForCurrency } from "@/lib/helpers";
import { format } from "date-fns";
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { startOfMonth } from "date-fns";
import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";

type SortBy = "date" | "amount" | "category";
type SortOrder = "asc" | "desc";

interface Props {
  userSettings: UserSettings;
}

function TransactionsTable({ userSettings }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [typeFilter, setTypeFilter] = useState<"income" | "expense" | "all">("all");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null, // null means no filter - show all transactions
    to: null,
  });
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const formatter = GetFormatterForCurrency(userSettings.currency);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const result = await GetTransactions({
          page,
          pageSize,
          type: typeFilter === "all" ? undefined : typeFilter,
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
          sortBy,
          sortOrder,
        });
        setTransactions(result.transactions);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (error) {
        toast.error("Failed to fetch transactions");
        console.error("Error fetching transactions:", error);
        setTransactions([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [page, pageSize, typeFilter, dateRange.from, dateRange.to, sortBy, sortOrder, userSettings.currency]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ column }: { column: SortBy }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    if (sortOrder === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              {total} transaction{total !== 1 ? "s" : ""} found
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value as "income" | "expense" | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial">
                <DateRangePicker
                  initialDateFrom={dateRange.from || startOfMonth(new Date())}
                  initialDateTo={dateRange.to || new Date()}
                  showCompare={false}
                  align="start"
                  onUpdate={(values) => {
                    const { from, to } = values.range;
                    if (!from || !to) {
                      setDateRange({ from: null, to: null });
                      setPage(1);
                      return;
                    }
                    if (differenceInDays(to, from) > MAX_DATE_RANGE_DAYS) {
                      toast.error(
                        `The selected date range is too big. Max allowable range is ${MAX_DATE_RANGE_DAYS} days`
                      );
                      return;
                    }
                    setDateRange({ from, to });
                    setPage(1);
                  }}
                />
              </div>
              {(dateRange.from || dateRange.to) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => {
                    setDateRange({ from: null, to: null });
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonWrapper isLoading={loading}>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                {dateRange.from && dateRange.to
                  ? typeFilter !== "all"
                    ? `No ${typeFilter} transactions in the selected date range.`
                    : "No transactions in the selected date range."
                  : typeFilter !== "all"
                  ? `No ${typeFilter} transactions found.`
                  : "No transactions found. Create your first transaction to get started!"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="flex flex-col gap-3 md:hidden">
                {transactions.map((transaction, index) => {
                  const rowNumber = (page - 1) * pageSize + index + 1;
                  return (
                    <Card
                      key={transaction.id}
                      className={`border-l-4 ${
                        transaction.type === "income"
                          ? "border-l-emerald-500 dark:border-l-emerald-400"
                          : "border-l-rose-500 dark:border-l-rose-400"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header Row: Number, Category, Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <span className="text-sm font-medium text-muted-foreground flex-shrink-0 w-6 pt-0.5">
                                #{rowNumber}
                              </span>
                              <div className="text-2xl flex-shrink-0">
                                {transaction.categoryIcon}
                              </div>
                              <span className="font-semibold text-sm break-words flex-1">
                                {transaction.category}
                              </span>
                            </div>
                            <Badge
                              variant={transaction.type === "income" ? "default" : "destructive"}
                              className="flex items-center gap-1 text-xs flex-shrink-0 mt-0.5"
                            >
                              {transaction.type === "income" ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {transaction.type === "income" ? "Income" : "Expense"}
                            </Badge>
                          </div>

                          {/* Description Row */}
                          {transaction.description && (
                            <div className="pl-11">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {transaction.description}
                              </p>
                            </div>
                          )}

                          {/* Footer Row: Date and Amount */}
                          <div className="flex items-center justify-between gap-2 pl-11">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(transaction.date), "MMM dd, yyyy")}
                            </span>
                            <span
                              className={`text-base font-bold ${
                                transaction.type === "income"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {transaction.type === "income" ? "+" : "-"}
                              {formatter.format(Math.abs(transaction.amount))}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] text-center">#</TableHead>
                      <TableHead className="w-[120px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 -ml-3"
                          onClick={() => handleSort("date")}
                        >
                          Date
                          <SortIcon column="date" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 -ml-3"
                          onClick={() => handleSort("category")}
                        >
                          Category
                          <SortIcon column="category" />
                        </Button>
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 -mr-3 float-right"
                          onClick={() => handleSort("amount")}
                        >
                          Amount
                          <SortIcon column="amount" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction, index) => {
                      const rowNumber = (page - 1) * pageSize + index + 1;
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-center text-muted-foreground font-medium">
                            {rowNumber}
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="text-sm">
                              {format(new Date(transaction.date), "MMM dd, yyyy")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{transaction.categoryIcon}</span>
                              <span className="font-medium">{transaction.category}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[300px] truncate">
                              {transaction.description || (
                                <span className="text-muted-foreground italic">No description</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Badge
                                variant={transaction.type === "income" ? "default" : "destructive"}
                                className="flex items-center gap-1"
                              >
                                {transaction.type === "income" ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {transaction.type === "income" ? "Income" : "Expense"}
                              </Badge>
                              <span
                                className={`font-semibold ${
                                  transaction.type === "income"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {transaction.type === "income" ? "+" : "-"}
                                {formatter.format(Math.abs(transaction.amount))}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page > 1) setPage((p) => p - 1);
                          }}
                          className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(pageNum);
                              }}
                              isActive={page === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      {totalPages > 5 && page < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page < totalPages) setPage((p) => p + 1);
                          }}
                          className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </SkeletonWrapper>
      </CardContent>
    </Card>
  );
}

export default TransactionsTable;

