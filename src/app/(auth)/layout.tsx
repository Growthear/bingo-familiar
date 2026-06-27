export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 to-purple-100">
      {children}
    </main>
  )
}
