import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Copy to Figma",
    description:
      "Copy any website to Figma. One click, paste in Figma. No plugin needed.",
    action: {
      default_title: "Open capture workspace",
    },
    permissions: ["activeTab", "clipboardWrite", "scripting", "storage"],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["fonts/*.ttf"],
        matches: ["<all_urls>"],
      },
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
