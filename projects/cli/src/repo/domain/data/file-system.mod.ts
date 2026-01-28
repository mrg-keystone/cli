export async function createDirectory(path: string): Promise<void> {
  await Deno.mkdir(path, { recursive: true });
}
