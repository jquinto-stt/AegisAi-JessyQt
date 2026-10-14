export default {
  scope: "necto",
  name: "pasarela-pagos",
  taxonomy: "project",

  sst: {
    app: "pasarela-pagos",
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