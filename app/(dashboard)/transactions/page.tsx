import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TransactionsTable from "./_components/TransactionsTable";

async function TransactionsPage() {
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
        <div className="container flex flex-wrap items-center justify-between gap-6 py-8">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your transactions
            </p>
          </div>
        </div>
      </div>
      <div className="container py-6">
        <TransactionsTable userSettings={userSettings} />
      </div>
    </div>
  );
}

export default TransactionsPage;

