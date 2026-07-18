async function flashResearch(query) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return { status: "proceed", query };
}

module.exports = { flashResearch };
