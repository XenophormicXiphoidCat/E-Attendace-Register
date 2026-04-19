import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="rounded-3xl bg-white/85 p-8 text-center shadow-card">
        <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
        <Link to="/dashboard" className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-3 text-white">
          Return to dashboard
        </Link>
      </div>
    </main>
  )
}
