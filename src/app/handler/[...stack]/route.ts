import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/lib/stack";

export const GET = StackHandler({ app: stackServerApp, fullPage: true });
export const POST = StackHandler({ app: stackServerApp, fullPage: true });
