import { defineConfig } from "@trigger.dev/sdk/v3";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { aptGet } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  // Your Trigger.dev project ref — get this from your dashboard
  // after running: npx trigger.dev@latest init
  project: "proj_hxynfjxtnjgymnvhxdsv", // Replace with your actual project ref
  runtime: "node",
  logLevel: "log",
  maxDuration: 120, // 2 minutes max per task
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      prismaExtension({
        schema: "./prisma/schema.prisma",
        mode: "legacy",
      }),
      aptGet({ packages: ["ffmpeg"] }),
    ],
  },
});