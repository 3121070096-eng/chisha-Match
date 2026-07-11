import { AdminLitePanel } from "@/components/AdminLitePanel";

// Keep the previous internal path available, but protect it with the same
// server-side environment flag and password flow as /admin-lite.
export default function DebugPage() {
  return <AdminLitePanel />;
}
