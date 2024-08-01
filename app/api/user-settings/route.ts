import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

//api that return user setings

export async function GET(request: Request) {
  //get loggedin user from Clerk
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  let userSettings = await prisma.userSettings.findUnique({
    where: {
      userId: user.id,
    },
  });

  //user visits /wizard page for the first time (after login)
  if (!userSettings) {
    userSettings = await prisma.userSettings.create({
      data: {
        userId: user.id,
        currency: "EUR",
      },
    });
  }

  // Revalidate the home page that uses the user currency
  revalidatePath("/");
  return Response.json(userSettings);
}
