function normalizeProtocol(p) {
  p.id = p.id || "";
  p.name = p.name || "";
  p.image = p.image ?? "";
  p.chain = p.chain ?? "";
  p.network = p.network ?? "";
  p.category = p.category ?? "";
  p.subcategory = p.subcategory ?? "";
  p.allCategories = p.allCategories ?? "";
  p.summary = p.summary ?? "";
  p.who_its_for = p.who_its_for ?? "";
  p.who_its_not_for = p.who_its_not_for ?? "";
  p.contract_address = p.contract_address ?? "";
  p.deployed_date = p.deployed_date ?? "";
  p.age_summary = p.age_summary ?? "";
  p.team_as_of = p.team_as_of ?? "";
  p.score = p.score ?? null;
  p.score_max = p.score_max ?? null;
  p.contract_verified = p.contract_verified ?? null;

  p.links = p.links || {};
  p.links.project = p.links.project ?? "";
  p.links.twitter = p.links.twitter ?? "";
  p.links.discord = p.links.discord ?? "";
  p.links.github = p.links.github ?? "";

  p.risks = p.risks || {};
  p.risks.contract = p.risks.contract ?? "";
  p.risks.community = p.risks.community ?? "";
  p.risks.structural = p.risks.structural ?? "";

  p.forensics = p.forensics || {};
  p.forensics.has_admin_functions = p.forensics.has_admin_functions ?? null;
  p.forensics.admin_function_notes = p.forensics.admin_function_notes ?? "";
  p.forensics.deployer_wallet_age = p.forensics.deployer_wallet_age ?? "";
  p.forensics.deployer_prior_deploys = p.forensics.deployer_prior_deploys ?? null;
  p.forensics.top_10_holder_concentration_pct = p.forensics.top_10_holder_concentration_pct ?? null;

  p.funding = p.funding || {};
  p.funding.has_funding_info = p.funding.has_funding_info ?? null;
  p.funding.investors = p.funding.investors ?? [];
  p.funding.source_note = p.funding.source_note ?? "";

  p.founder_history = p.founder_history || {};
  p.founder_history.prior_projects_found = p.founder_history.prior_projects_found ?? null;
  p.founder_history.details = p.founder_history.details ?? "";
  p.founder_history.confidence_note = p.founder_history.confidence_note ?? "";

  p.contracts = p.contracts ?? [];
  p.use_cases = p.use_cases ?? [];
  p.team = p.team ?? [];
  p.restricted_jurisdictions = p.restricted_jurisdictions ?? [];

  p.created_at = p.created_at ?? null;
  p.created_by_wallet = p.created_by_wallet ?? null;

  return p;
}

module.exports = { normalizeProtocol };
