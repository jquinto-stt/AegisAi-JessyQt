export default {
  name: "srv.api",
  taxonomy: "bundle",

  sst: {
    stack: "SrvApi",
  },

  dependencies: [],

  modules: {
    service: {
      hooks: {
        bundle: ["bundle"],
      },
    },
  },
};