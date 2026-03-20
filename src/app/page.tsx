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
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
      </div>

      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-8">
          <Workflow size={32} className="text-purple-400" />
        </div>

        <h1 className="text-5xl font-bold text-[#e4e4e7] mb-4 tracking-tight">
          Next<span className="text-purple-400">Flow</span>
        </h1>

        <p className="text-lg text-[#71717a] mb-8 leading-relaxed">
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
          ].map((feature) => (
            <span
              key={feature}
              className="px-3 py-1 rounded-full text-xs border border-[#2a2a2e] text-[#71717a] bg-[#141416]"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-in"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500
              text-white font-medium transition-colors"
          >
            <Play size={18} />
            Get Started
          </Link>
          <Link
            href="/sign-up"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#2a2a2e]
              hover:bg-[#141416] text-[#a1a1aa] hover:text-[#e4e4e7] font-medium transition-colors"
          >
            <Zap size={18} />
            Create Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-xs text-[#52525b]">
        Built with Next.js, React Flow, and Groq
      </div>
    </div>
  );
}
