import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/lib/stack";

export default function Handler(props: any) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 shadow-xl backdrop-blur-sm">
        <StackHandler app={stackServerApp} {...props} />
      </div>
    </div>
  );
}
