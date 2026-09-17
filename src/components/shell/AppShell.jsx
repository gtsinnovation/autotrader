import React from "react";
import { Outlet } from "react-router-dom";
import NavSidebar from "@/components/shell/NavSidebar";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <NavSidebar />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}