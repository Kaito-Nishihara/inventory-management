function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1 text-sm text-emerald-300">
          Tailwind CSS enabled
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Inventory Management
        </h1>
        <p className="max-w-xl text-slate-300">
          Edit <code className="rounded bg-slate-800 px-1 py-0.5">src/App.tsx</code> and
          start building your UI with utility classes.
        </p>
        <button className="rounded-lg bg-emerald-400 px-5 py-2 font-semibold text-slate-950 transition hover:bg-emerald-300">
          Ready
        </button>
      </div>
    </main>
  )
}

export default App
