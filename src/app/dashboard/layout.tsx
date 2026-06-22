import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Providers } from "../providers";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <Providers>
      <div className="flex h-screen bg-gray-50">
        <Sidebar user={session.user ?? { name: null, email: null }} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </Providers>
  );
}
