module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.dependencies?.["@p-stream/providers"]) {
        pkg.dependencies["@p-stream/providers"] = "link:./packages/providers-shim";
      }
      return pkg;
    },
  },
};
