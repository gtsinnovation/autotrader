import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shell/PageHeader";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.entities.User.list("-created_date", 200)
      .then(setUsers)
      .catch((e) => setError(e?.response?.data?.error || e.message));
  }, []);

  const admins = users.filter((u) => u.role === "admin").length;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = users.filter((u) => new Date(u.updated_date || u.created_date).getTime() > dayAgo).length;

  const stats = [
    { label: "TOTAL USERS", value: users.length },
    { label: "ADMINS", value: admins },
    { label: "ACTIVE IN LAST 24H", value: recent },
  ];

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 md:px-6">
      <PageHeader title="Admin" subtitle="App users and their access level. Only admins can control the agent." />

      {error ? (
        <p className="rounded-[4px] border border-destructive/40 bg-destructive/10 px-4 py-3 font-display text-[0.75rem] text-destructive">
          {error}
        </p>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-[4px] border border-border bg-card px-4 py-3">
                <p className="font-display text-[0.625rem] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="num mt-1 font-display text-[1.5rem] font-700 text-primary">{s.value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-[4px] border border-border bg-card">
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="text-[0.8125rem] font-500 text-foreground">{u.full_name || "—"}</span>
                  <span className="text-[0.75rem] text-muted-foreground">{u.email}</span>
                  <span
                    className={`rounded-[3px] border px-1.5 py-0.5 font-display text-[0.625rem] uppercase ${
                      u.role === "admin" ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {u.role}
                  </span>
                  <span className="num ml-auto font-display text-[0.6875rem] text-muted-foreground">
                    joined {new Date(u.created_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}