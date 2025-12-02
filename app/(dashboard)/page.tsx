import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import CreateTransactionDialog from "./_components/CreateTransactionDialog";
import Overview from "./_components/Overview";

async function page() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }
  const userSettings = await prisma.userSettings.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (!userSettings) {
    redirect("/wizard");
  }

  return (
    <div className="h-full bg-background">
      <div className="border-b bg-card">
        <div className="container flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 py-6 sm:py-8">
          <p className="text-2xl sm:text-3xl font-bold">Hello, {user.firstName}! 👏</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <CreateTransactionDialog
              trigger={
                <Button className="w-full sm:w-auto border-emerald-500 bg-emerald-950 text-white hover:bg-emerald-700 hover:text-white">
                  New Income 😊
                </Button>
              }
              type="income"
            />
            <CreateTransactionDialog
              trigger={
                <Button className="w-full sm:w-auto border-rose-500 bg-rose-950 text-white hover:bg-rose-700 hover:text-white">
                  New Expense 😔
                </Button>
              }
              type="expense"
            />
          </div>
        </div>
      </div>
      <Overview userSettings={userSettings} />
    </div>
  );
}

export default page;
