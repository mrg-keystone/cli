await Deno.remove("dist", { recursive: true }).catch(() => {});
console.log("Cleaned dist/");
