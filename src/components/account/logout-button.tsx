"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="hover:bg-ink-50 px-3 py-2 text-left text-sm font-medium text-red-600"
    >
      Sign Out
    </button>
  );
}
