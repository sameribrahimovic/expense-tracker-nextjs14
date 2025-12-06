"use server";

import prisma from "@/lib/prisma";
import {
  CreateTransactionSchema,
  CreateTransactionSchemaType,
} from "@/schema/transaction";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Transaction } from "@prisma/client";
import { DateToUTCDate } from "@/lib/helpers";

export async function CreateTransaction(form: CreateTransactionSchemaType) {
  const parsedBody = CreateTransactionSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { amount, category, date, description, type } = parsedBody.data;
  const categoryRow = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: category,
    },
  });

  if (!categoryRow) {
    throw new Error("category not found");
  }

  // NOTE: don't make confusion between $transaction ( prisma ) and prisma.transaction (table)

  await prisma.$transaction([
    // Create user transaction
    prisma.transaction.create({
      data: {
        userId: user.id,
        amount,
        date,
        description: description || "",
        type,
        category: categoryRow.name,
        categoryIcon: categoryRow.icon,
      },
    }),

    // Update month aggregate table
    prisma.monthHistory.upsert({
      where: {
        day_month_year_userId: {
          userId: user.id,
          day: date.getUTCDate(),
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        userId: user.id,
        day: date.getUTCDate(),
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
        expense: type === "expense" ? amount : 0,
        income: type === "income" ? amount : 0,
      },
      update: {
        expense: {
          increment: type === "expense" ? amount : 0,
        },
        income: {
          increment: type === "income" ? amount : 0,
        },
      },
    }),

    // Update year aggreate
    prisma.yearHistory.upsert({
      where: {
        month_year_userId: {
          userId: user.id,
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        userId: user.id,
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
        expense: type === "expense" ? amount : 0,
        income: type === "income" ? amount : 0,
      },
      update: {
        expense: {
          increment: type === "expense" ? amount : 0,
        },
        income: {
          increment: type === "income" ? amount : 0,
        },
      },
    }),
  ]);
}

export async function GetTransactions({
  page = 1,
  pageSize = 10,
  type,
  from,
  to,
  sortBy = "date",
  sortOrder = "desc",
}: {
  page?: number;
  pageSize?: number;
  type?: "income" | "expense";
  from?: Date;
  to?: Date;
  sortBy?: "date" | "amount" | "category";
  sortOrder?: "asc" | "desc";
}): Promise<{
  transactions: Transaction[];
  total: number;
  totalPages: number;
}> {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const where: any = {
    userId: user.id,
  };

  if (type) {
    where.type = type;
  }

  if (from || to) {
    where.date = {};
    if (from) {
      where.date.gte = DateToUTCDate(from);
    }
    if (to) {
      // Set to end of day for the 'to' date
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      where.date.lte = DateToUTCDate(endOfDay);
    }
  }

  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function UpdateTransaction(
  id: string,
  form: CreateTransactionSchemaType
) {
  const parsedBody = CreateTransactionSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Get the existing transaction to calculate differences
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!existingTransaction || existingTransaction.userId !== user.id) {
    throw new Error("Transaction not found");
  }

  const { amount, category, date, description, type } = parsedBody.data;
  const categoryRow = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: category,
    },
  });

  if (!categoryRow) {
    throw new Error("category not found");
  }

  const oldDate = existingTransaction.date;
  const oldAmount = existingTransaction.amount;
  const oldType = existingTransaction.type;

  await prisma.$transaction([
    // Update the transaction
    prisma.transaction.update({
      where: { id },
      data: {
        amount,
        date,
        description: description || "",
        type,
        category: categoryRow.name,
        categoryIcon: categoryRow.icon,
        updateAt: new Date(),
      },
    }),

    // Update old month aggregate (subtract old transaction)
    prisma.monthHistory.upsert({
      where: {
        day_month_year_userId: {
          userId: user.id,
          day: oldDate.getUTCDate(),
          month: oldDate.getUTCMonth(),
          year: oldDate.getUTCFullYear(),
        },
      },
      create: {
        userId: user.id,
        day: oldDate.getUTCDate(),
        month: oldDate.getUTCMonth(),
        year: oldDate.getUTCFullYear(),
        expense: 0,
        income: 0,
      },
      update: {
        expense: {
          decrement: oldType === "expense" ? oldAmount : 0,
        },
        income: {
          decrement: oldType === "income" ? oldAmount : 0,
        },
      },
    }),

    // Update old year aggregate (subtract old transaction)
    prisma.yearHistory.upsert({
      where: {
        month_year_userId: {
          userId: user.id,
          month: oldDate.getUTCMonth(),
          year: oldDate.getUTCFullYear(),
        },
      },
      create: {
        userId: user.id,
        month: oldDate.getUTCMonth(),
        year: oldDate.getUTCFullYear(),
        expense: 0,
        income: 0,
      },
      update: {
        expense: {
          decrement: oldType === "expense" ? oldAmount : 0,
        },
        income: {
          decrement: oldType === "income" ? oldAmount : 0,
        },
      },
    }),

    // Update new month aggregate (add new transaction)
    prisma.monthHistory.upsert({
      where: {
        day_month_year_userId: {
          userId: user.id,
          day: date.getUTCDate(),
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        userId: user.id,
        day: date.getUTCDate(),
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
        expense: type === "expense" ? amount : 0,
        income: type === "income" ? amount : 0,
      },
      update: {
        expense: {
          increment: type === "expense" ? amount : 0,
        },
        income: {
          increment: type === "income" ? amount : 0,
        },
      },
    }),

    // Update new year aggregate (add new transaction)
    prisma.yearHistory.upsert({
      where: {
        month_year_userId: {
          userId: user.id,
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        userId: user.id,
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
        expense: type === "expense" ? amount : 0,
        income: type === "income" ? amount : 0,
      },
      update: {
        expense: {
          increment: type === "expense" ? amount : 0,
        },
        income: {
          increment: type === "income" ? amount : 0,
        },
      },
    }),
  ]);
}

export async function DeleteTransaction(id: string) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Get the transaction to calculate what to subtract
  const transaction = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!transaction || transaction.userId !== user.id) {
    throw new Error("Transaction not found");
  }

  const { amount, date, type } = transaction;

  await prisma.$transaction([
    // Delete the transaction
    prisma.transaction.delete({
      where: { id },
    }),

    // Update month aggregate (subtract transaction)
    prisma.monthHistory.upsert({
      where: {
        day_month_year_userId: {
          userId: user.id,
          day: date.getUTCDate(),
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        userId: user.id,
        day: date.getUTCDate(),
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
        expense: 0,
        income: 0,
      },
      update: {
        expense: {
          decrement: type === "expense" ? amount : 0,
        },
        income: {
          decrement: type === "income" ? amount : 0,
        },
      },
    }),

    // Update year aggregate (subtract transaction)
    prisma.yearHistory.upsert({
      where: {
        month_year_userId: {
          userId: user.id,
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        userId: user.id,
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
        expense: 0,
        income: 0,
      },
      update: {
        expense: {
          decrement: type === "expense" ? amount : 0,
        },
        income: {
          decrement: type === "income" ? amount : 0,
        },
      },
    }),
  ]);
}
