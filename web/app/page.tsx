import { readFile } from "node:fs/promises";
import path from "node:path";
import Workspace from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const seed = JSON.parse(
    await readFile(path.join(process.cwd(), "../fixtures/seed.json"), "utf8"),
  );
  return <Workspace seed={seed} />;
}
