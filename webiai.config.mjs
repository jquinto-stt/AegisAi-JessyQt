export default {
  name: "necto",
  scopes: ["@stt"],
  artifacts: {
    organization: "stt",
    app: "necto",
    context: "core",
  },
  devlink: {
    bundlePrefix: "apps",
    bundleDefault: "web",
    packagesDir: "packages",
  },
};