const { flashResearch } = require("../src/services/flashResearcher.js");
(async () => {
  const result = await flashResearch("kuru");
  console.log(result);
})();
