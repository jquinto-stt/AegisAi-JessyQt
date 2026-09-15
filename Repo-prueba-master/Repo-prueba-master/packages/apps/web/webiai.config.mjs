export default {
  name: "app.web",
  taxonomy: "bundle",

  sst: {
    stack: "AppWeb",
  },

  dependencies: [],

  modules: {
    app: {
      hooks: {
        build: ["build"],
      },
    },
  },
};