const steps = ["clean", "compile", "generate-package", "install", "clean"];

for (const step of steps) {
  await import(`./${step}.ts`);
}
