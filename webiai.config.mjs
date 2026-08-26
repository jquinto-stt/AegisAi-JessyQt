export default {
  scope: "stt",
  name: "stockflow",
  taxonomy: "project",

  sst: {
    app: "stockflow",
  },

  sdk: {
    version: "0.23.11",
    packages: ["core", "aws", "infra-provider", "infra"],
  },

  devlink: {
    modes: {
      default: "dev",
      dev: () => ({ manager: "store" }),
    },
  },
};