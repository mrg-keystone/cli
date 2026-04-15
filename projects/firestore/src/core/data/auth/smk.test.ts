import { assertEquals } from "@std/assert";
import { getAccessToken } from "./mod.ts";

Deno.test("getAccessToken — emulator mode returns 'owner'", async () => {
  const token = await getAccessToken(
    { project_id: "p", client_email: "x@x", private_key: "" },
    { emulator: true },
  );
  assertEquals(token, "owner");
});
