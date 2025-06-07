import React from "react";
import { Navbar } from "./navbar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container mx-auto px-4">
        <Outlet />
      </main>
    </div>
  );
}
