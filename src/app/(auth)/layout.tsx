export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-100 via-white to-sky-100">
      {children}
    </main>
  )
}
