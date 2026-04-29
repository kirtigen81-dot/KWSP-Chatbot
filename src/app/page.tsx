import ChatInterface from '@/components/ChatInterface'

export default function HomePage() {
  return (
    <main className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-kwsp-green text-white px-4 sm:px-6 py-4 shadow-md flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo circle */}
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-kwsp-green font-extrabold text-lg leading-none">K</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold leading-tight">KWSP AI Assistant</h1>
            <p className="text-green-200 text-xs hidden sm:block">EPF Malaysia • Powered by AI</p>
          </div>
        </div>

        <a
          href="/admin"
          className="text-green-200 hover:text-white text-sm underline underline-offset-2 transition-colors"
        >
          Admin
        </a>
      </header>

      <ChatInterface />
    </main>
  )
}
