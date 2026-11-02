import Link from "next/link";
import { Bell, LayoutDashboard, LogOut, ReceiptText, Recycle, Truck, User } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { recyclerLogoutAction } from "./actions";
import { getUnreadNotificationCount } from "@/lib/services/notificationService";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";
import { T } from "@/app/collector/ui";

export default async function RecyclerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  let unreadNotifications = 0;
  if (session) {
    unreadNotifications = await getUnreadNotificationCount(session.userId);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" }}>
      <header className="navbar">
        <div className="navbar-inner r-navbar-inner" style={{ maxWidth: "1100px" }}>
          <Link href="/recycler" className="brand">
            <Recycle size={22} aria-hidden="true" />
            <span>Kabadi Wala</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <LanguageSwitcher />

            {session && (
              <nav className="r-nav" aria-label="Recycler">
                <Link href="/recycler" className="nav-link r-nav-link" aria-label="Dashboard">
                  <LayoutDashboard size={18} aria-hidden="true" />
                  <span className="r-nav-label"><T hi="डैशबोर्ड" en="Dashboard" mr="डॅशबोर्ड" /></span>
                </Link>
                <Link href="/recycler/history" className="nav-link r-nav-link" aria-label="Order history">
                  <ReceiptText size={18} aria-hidden="true" />
                  <span className="r-nav-label"><T hi="इतिहास" en="History" mr="इतिहास" /></span>
                </Link>
                <Link href="/recycler/vehicles" className="nav-link r-nav-link" aria-label="Vehicles">
                  <Truck size={18} aria-hidden="true" />
                  <span className="r-nav-label"><T hi="गाड़ियां" en="Vehicles" mr="गाड्या" /></span>
                </Link>
                <Link
                  href="/recycler/notifications"
                  className="nav-link r-nav-link"
                  aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
                >
                  <Bell size={18} aria-hidden="true" />
                  <span className="r-nav-label"><T hi="सूचनाएं" en="Notifications" mr="सूचना" /></span>
                  {unreadNotifications > 0 && (
                    <span className="r-nav-count" aria-hidden="true">{unreadNotifications}</span>
                  )}
                </Link>
                <Link href="/recycler/profile" className="nav-link r-nav-link" aria-label="Profile">
                  <User size={18} aria-hidden="true" />
                  <span className="r-nav-label"><T hi="प्रोफ़ाइल" en="Profile" mr="प्रोफाइल" /></span>
                </Link>
                <form action={recyclerLogoutAction} style={{ display: "inline" }}>
                  <button
                    type="submit"
                    className="btn btn-sm btn-secondary r-inline"
                    style={{ color: "var(--danger)" }}
                    aria-label="Sign out"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    <span className="r-nav-label"><T hi="लॉग आउट" en="Sign out" mr="लॉग आउट" /></span>
                  </button>
                </form>
              </nav>
            )}
          </div>
        </div>
      </header>

      <main className="container-xl" style={{ flex: 1, padding: "1.25rem 1rem 3rem", maxWidth: "1100px" }}>
        {children}
      </main>
    </div>
  );
}
