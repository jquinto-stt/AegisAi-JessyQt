export default {
  scope: "stt",
  name: "repo-prueba",
  taxonomy: "project",

  sst: {
    app: "repo-prueba",
  },

  sdk: {
    version: "0.23.11",
    packages: ["core", "aws", "infra-provider", "infra", "http", "ioc"],
  },

  devlink: {
    modes: {
      default: "dev",
      dev: () => ({ manager: "store" }),
    },
  },
};