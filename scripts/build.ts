export {};

const compileTarget = Bun.env.PKDX_BUILD_TARGET;

const result = await Bun.build({
  compile: {
    ...(compileTarget === undefined ? {} : { target: compileTarget }),
    outfile: "dist/pkdx",
  },
  entrypoints: ["src/cli.tsx"],
} as Parameters<typeof Bun.build>[0] & {
  compile: { outfile: string; target?: string };
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}
