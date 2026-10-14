export default {
  name: "core",
  taxonomy: "bundle",

  sst: {
    stack: "Core",
  },

  dependencies: [],

  modules: {
    web: {
      hooks: {
        build: ["build"],
      },
    },

    api: {
      hooks: {
        bundle: ["bundle"],
      },
    },
  },
};