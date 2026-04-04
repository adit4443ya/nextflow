import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Play, Workflow, Zap } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();

  // If already signed in, go straight to workflow editor
  if (userId) {
    redirect("/workflow");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3FF] via-white to-[#EEF2FF] dark:from-[#0a0a0b] dark:bg-[#0a0a0b] flex flex-col items-center justify-center px-4 transition-colors">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-500/15 dark:bg-blue-600/8 blur-[100px]" />
      </div>

      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-white border border-indigo-100 dark:bg-purple-500/20 dark:border-purple-500/30 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-900/5">
          <Workflow size={32} className="text-indigo-600 dark:text-purple-400" />
        </div>

        <h1 className="text-5xl font-bold text-indigo-950 dark:text-[#e4e4e7] mb-4 tracking-tight">
          Next<span className="text-indigo-600 dark:text-purple-400">Flow</span>
        </h1>

        <p className="text-lg text-indigo-900/60 dark:text-[#71717a] mb-8 leading-relaxed">
          Visual workflow builder for LLM pipelines. Drag, connect, and run AI
          workflows with Groq, image processing, and video extraction —
          all in one canvas.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {[
            "React Flow Canvas",
            "Groq Inference",
            "Parallel Execution",
            "Type-Safe Connections",
            "Workflow History",
            "Export/Import",
            "Undo / Redo",
            "Transloadit CDN",
          ].map((feature) => (
            <span
              key={feature}
              className="px-3 py-1 rounded-full text-xs font-medium border border-indigo-100/50 text-indigo-600 bg-white/70 backdrop-blur-md dark:border-[#2a2a2e] dark:text-[#71717a] dark:bg-[#141416] shadow-sm"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-in"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500
              text-white font-medium shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 hover:-translate-y-0.5"
          >
            <Play size={18} />
            Get Started
          </Link>
          <Link
            href="/sign-up"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-indigo-200 dark:border-[#2a2a2e]
              hover:bg-indigo-50 bg-white dark:bg-transparent dark:hover:bg-[#141416] text-indigo-700 dark:text-[#a1a1aa] hover:text-indigo-900 dark:hover:text-[#e4e4e7] font-medium shadow-sm transition-all hover:scale-105 hover:-translate-y-0.5"
          >
            <Zap size={18} />
            Create Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-3 text-xs text-indigo-900/40 dark:text-[#52525b]">
        <span>Built with Next.js, React Flow &amp; Groq</span>
        <span className="w-1 h-1 rounded-full bg-indigo-200 dark:bg-[#3a3a3e]" />
        <span className="text-indigo-600/60 dark:text-purple-500/60 font-medium">v1.0</span>
      </div>
    </div>
  );
}
