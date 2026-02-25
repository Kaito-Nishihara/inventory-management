import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "http://localhost:5001/openapi/v1.json",
  output: "src/api/identity",
  plugins: ["@hey-api/client-fetch"],
})
