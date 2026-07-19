<script>
  import { useLocation } from "../lib/router.svelte.js";
  import Link from "../lib/Link.svelte";
  import { getWallet } from "../lib/wallet.svelte.js";
  import { getNetwork } from "../lib/network.svelte.js";
  import { VERIFY_WINDOW_HOURS } from "../lib/constants.js";
  import { getProtocol, getFavorites, toggleFavorite as apiToggleFavorite, commitProtocol } from "../lib/api.js";
  import ScoreBadge from "../lib/ScoreBadge.svelte";

  const KYP_CONTRACT_TESTNET = import.meta.env.VITE_KYP_CONTRACT_ADDRESS || "0x325215e272e0f5efb33d697c356a5ccbfaf6ecaf";
  const KYP_CONTRACT_MAINNET = import.meta.env.VITE_KYP_CONTRACT_ADDRESS_MAINNET || KYP_CONTRACT_TESTNET;

  let location = useLocation();
  let id = $derived(location.pathname.split("/").pop());

  let protocol = $state(null);
  let isFavorited = $state(false);
  let showStakeModal = $state(false);
  let stakeAmount = $state("0.01");
  let wallet = getWallet();
  let network = getNetwork();
  let stakeConfirmed = $state(false);
  let stakeLoading = $state(false);
  let stakeError = $state("");
  let deadlineTimestamp = $state("");

  let contractsExpanded = $state(false);

  function hasText(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function hasItems(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function hasMeta(protocolData) {
    return [protocolData?.chain, protocolData?.network, protocolData?.category, protocolData?.subcategory].some(hasText);
  }

  function hasContracts(contracts) {
    return hasItems(contracts) && contracts.some((contract) => hasText(contract?.name) || hasText(contract?.address));
  }

  function hasTeam(team) {
    return hasItems(team) && team.some((member) => hasText(member?.name) || hasText(member?.role));
  }

  function hasRestrictedJurisdictions(jurisdictions) {
    return hasItems(jurisdictions) && jurisdictions.some(hasText);
  }

  function truncateAddress(address) {
    if (!hasText(address)) return "";
    return address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
  }

  function hasLinks(links) {
    return Boolean(links && [links.project, links.twitter, links.discord, links.github].some(hasText));
  }

  function hasRisks(risks) {
    return Boolean(risks && [risks.contract, risks.community, risks.structural].some(hasText));
  }

  function hasForensics(forensics) {
    if (!forensics) return false;
    return forensics.has_admin_functions !== null
      || hasText(forensics.admin_function_notes)
      || hasText(forensics.deployer_wallet_age)
      || forensics.deployer_prior_deploys !== null
      || forensics.top_10_holder_concentration_pct !== null;
  }

  function hasFunding(funding) {
    return Boolean(funding && funding.has_funding_info !== null);
  }

  function hasFounderHistory(founderHistory) {
    if (!founderHistory) return false;
    return founderHistory.prior_projects_found !== null
      || hasText(founderHistory.details)
      || hasText(founderHistory.confidence_note);
  }

  function derivedAgeSummary(protocolData) {
    if (hasText(protocolData?.age_summary)) return protocolData.age_summary;
    if (!hasText(protocolData?.deployed_date)) return "";
    const deployed = new Date(`${protocolData.deployed_date}T00:00:00Z`);
    if (Number.isNaN(deployed.getTime())) return "";
    const days = Math.max(0, Math.floor((Date.now() - deployed.getTime()) / (1000 * 60 * 60 * 24)));
    if (days < 30) return `Live for ${days} day${days === 1 ? "" : "s"}`;
    if (days < 365) {
      const months = Math.round((days / 30) * 10) / 10;
      return `Live for ${months} month${months === 1 ? "" : "s"}`;
    }
    const years = Math.round((days / 365) * 10) / 10;
    return `Live for ${years} year${years === 1 ? "" : "s"}`;
  }

  let loadStatus = $state("idle");
  let loadError = $state("");
  let coldTimer = null;

  let deepCountdown = $state(0);
  let deepTimer = null;

  function startDeepCountdown() {
    clearInterval(deepTimer);
    deepCountdown = 40;
    deepTimer = setInterval(() => {
      deepCountdown--;
      if (deepCountdown <= 0) {
        clearInterval(deepTimer);
        loadProtocol(id);
      }
    }, 1000);
  }

  function isDeepResearchPending(p) {
    return p && (p.deep_research_status === "pending" || p.deep_research_status === "running");
  }

  function loadProtocol(protocolId) {
    clearTimeout(coldTimer);
    loadStatus = "fetching";
    loadError = "";
    protocol = null;
    coldTimer = setTimeout(() => {
      if (loadStatus === "fetching") loadStatus = "waking";
    }, 4000);
    getProtocol(protocolId)
      .then((data) => {
        clearTimeout(coldTimer);
        protocol = data;
        loadStatus = "success";
        if (isDeepResearchPending(data)) {
          startDeepCountdown();
        }
      })
      .catch((err) => { clearTimeout(coldTimer); loadError = err.message || "Protocol not found"; loadStatus = "error"; });
  }

  $effect(() => {
    if (id) loadProtocol(id);
    return () => { clearInterval(deepTimer); };
  });

  $effect(() => {
    if (wallet.authenticated && wallet.address && id) {
      getFavorites(wallet.address).then((favs) => {
        isFavorited = favs.some((f) => f.protocol_id === id);
      }).catch(() => {});
    }
  });

  async function toggleFavorite() {
    if (!wallet.authenticated || !wallet.address) {
      wallet.login?.();
      return;
    }
    try {
      const result = await apiToggleFavorite(wallet.address, id);
      isFavorited = result.favorited;
    } catch (err) {
      console.error("Toggle favorite failed:", err);
    }
  }

  function handleCommit() {
    if (!wallet.authenticated) {
      wallet.login?.();
      return;
    }
    showStakeModal = true;
  }

  function parseStakeError(err) {
    const msg = err?.message || String(err);
    if (msg.includes("ChainMismatchError") || msg.includes("does not match the target chain")) {
      return "Network mismatch — switch to the same network on the site and in your wallet.";
    }
    if (msg.includes("User rejected") || msg.includes("4001")) {
      return "Transaction rejected.";
    }
    if (msg.includes("insufficient funds") || msg.includes("Insufficient balance")) {
      return "Not enough MON for this transaction.";
    }
    if (msg.includes("out of gas") || msg.includes("gas")) {
      return "Transaction failed — try again.";
    }
    const short = msg.length > 120 ? msg.slice(0, 120) + "..." : msg;
    return short || "Transaction failed.";
  }

  async function confirmCommit() {
    stakeLoading = true;
    stakeError = "";
    try {
      const ethereumProvider = await wallet.getProvider();
      if (!ethereumProvider) throw new Error("Wallet provider not available");

      const { createWalletClient, custom, parseAbi, decodeEventLog, parseEther, http, createPublicClient } = await import("viem");
      const { monadTestnet, monad } = await import("viem/chains");
      const activeChain = network.isMainnet ? monad : monadTestnet;

      const userAddress = wallet.address;
      if (!userAddress) throw new Error("No connected wallet address");

      const walletClient = createWalletClient({
        account: wallet.address,
        chain: activeChain,
        transport: custom(ethereumProvider),
      });

      const protocolAddr = protocol.contracts?.[0]?.address;
      if (!protocolAddr) throw new Error("No contract address found for this protocol");

      const stakeAbi = parseAbi(["function stake(address protocolAddress) payable returns (uint256)"]);
      const stakedEventAbi = parseAbi(["event Staked(uint256 indexed commitmentId, address indexed user, address indexed protocolAddress, uint256 amount, uint256 verifyDeadline)"]);

      const kypContract = network.isMainnet ? KYP_CONTRACT_MAINNET : KYP_CONTRACT_TESTNET;
      const txHash = await walletClient.writeContract({
        address: kypContract,
        abi: stakeAbi,
        functionName: "stake",
        args: [protocolAddr],
        value: parseEther(stakeAmount),
      });

      const publicClient = createPublicClient({ chain: activeChain, transport: http() });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      let onchainCommitmentId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({ abi: stakedEventAbi, data: log.data, topics: log.topics });
          if (parsed.eventName === "Staked") {
            onchainCommitmentId = Number(parsed.args.commitmentId);
            break;
          }
        } catch {}
      }

      await commitProtocol({
        user_wallet: userAddress,
        protocol_id: protocol.id,
        protocol_contract_address: protocolAddr,
        staked_amount: parseEther(stakeAmount).toString(),
        stake_tx_hash: receipt.transactionHash,
        onchain_commitment_id: onchainCommitmentId,
        network: network.current,
      });

      let deadline = new Date(Date.now() + VERIFY_WINDOW_HOURS * 60 * 60 * 1000);
      deadlineTimestamp = deadline.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      stakeConfirmed = true;
    } catch (err) {
      console.error("Commit failed:", err);
      stakeError = parseStakeError(err);
    } finally {
      stakeLoading = false;
    }
  }
</script>

{#if loadStatus === "fetching" || loadStatus === "waking"}
  <div class="protocol-loading">
    <span class="material-symbols-outlined loading-icon spin">progress_activity</span>
    {#if loadStatus === "waking"}
      <p class="loading-text">Server is waking up...</p>
      <p class="loading-sub">Free tier backend takes ~30s on first request</p>
    {:else}
      <p class="loading-text">Loading protocol...</p>
    {/if}
  </div>
{:else if loadStatus === "error"}
  <div class="protocol-loading error">
    <span class="material-symbols-outlined loading-icon">error</span>
    <p class="loading-text">{loadError}</p>
    <button class="retry-btn" onclick={() => loadProtocol(id)}>Try Again</button>
  </div>
{:else if protocol}
  <div class="protocol-page">
    {#if isDeepResearchPending(protocol)}
      <div class="deep-research-banner">
        <span class="material-symbols-outlined banner-icon spin">progress_activity</span>
        <span class="banner-text">Deep research running in the background — refreshing in {deepCountdown}s</span>
      </div>
    {/if}
    <div class="profile-header">
      <div class="header-top">
        <div class="name-shield-row">
          {#if protocol.image}
            <img src={protocol.image} alt={protocol.name} class="protocol-logo" />
          {/if}
          <h1 class="protocol-name">{protocol.name}</h1>
          <button
            class="fav-btn"
            class:faved={isFavorited}
            onclick={toggleFavorite}
            aria-label={isFavorited ? "Remove from favourites" : "Add to favourites"}
            title={isFavorited ? "Remove from favourites" : "Add to favourites"}
          >
            <span class="fav-star" aria-hidden="true">{isFavorited ? "★" : "☆"}</span>
          </button>
        </div>
        <div class="badge-top">
          <ScoreBadge score={protocol.score} size="lg" />
        </div>
      </div>
    </div>

    <div class="profile-body">
      {#if hasText(protocol.plain_summary)}
        <div class="plain-summary-card">
          <p>{protocol.plain_summary}</p>
        </div>
      {/if}

      {#if hasMeta(protocol)}
        <div class="meta-row-section">
        {#if hasText(protocol.chain)}
          <span class="meta-badge chain">{protocol.chain}</span>
        {/if}
        {#if hasText(protocol.network)}
          <span class="meta-badge">{protocol.network}</span>
        {/if}
        {#if hasText(protocol.category)}
          <span class="meta-badge">{protocol.category}</span>
        {/if}
        {#if hasText(protocol.subcategory)}
          <span class="meta-badge">{protocol.subcategory}</span>
        {/if}
        </div>
      {/if}

      <div class="verification-badge" class:verified={protocol.contract_verified === true} class:unverified={protocol.contract_verified === false}>
        {#if protocol.contract_verified === true}
          <span class="material-symbols-outlined">verified</span> Verified
        {:else if protocol.contract_verified === false}
          <span class="material-symbols-outlined">warning</span> Unverified
        {:else}
          <span class="material-symbols-outlined">help</span> Verification unknown
        {/if}
      </div>

      {#if hasContracts(protocol.contracts)}
        <div class="info-section">
          <h3 class="section-label">Contracts</h3>
          <div class="contract-list">
            {#each (contractsExpanded ? protocol.contracts : protocol.contracts.slice(0, 4)) as contract, index}
              <div class="contract-row">
                <span class="contract-name">{hasText(contract.name) ? contract.name : `Contract ${index + 1}`}</span>
                {#if hasText(contract.address)}
                  <span class="contract-address" title={contract.address}>{truncateAddress(contract.address)}</span>
                {/if}
              </div>
            {/each}
          </div>
          {#if protocol.contracts.length > 4}
            <button class="text-toggle" onclick={() => (contractsExpanded = !contractsExpanded)}>
              {contractsExpanded ? "Show fewer contracts" : `Show all ${protocol.contracts.length} contracts`}
            </button>
          {/if}
        </div>
      {/if}

      {#if hasText(protocol.summary)}
        <div class="info-section">
          <h3 class="section-label">Technical Summary</h3>
          <p class="section-text">{protocol.summary}</p>
        </div>
      {/if}

      {#if hasText(protocol.who_its_for) || hasText(protocol.who_its_not_for)}
        <div class="persona-grid">
          {#if hasText(protocol.who_its_for)}
            <div class="info-section persona-card">
              <h3 class="section-label">Who It's For</h3>
              <p class="section-text">{protocol.who_its_for}</p>
            </div>
          {/if}
          {#if hasText(protocol.who_its_not_for)}
            <div class="info-section persona-card caution">
              <h3 class="section-label">Who It's NOT For</h3>
              <p class="section-text">{protocol.who_its_not_for}</p>
            </div>
          {/if}
        </div>
      {/if}

      {#if hasItems(protocol.use_cases)}
        <div class="info-section">
          <h3 class="section-label">Use Cases</h3>
          <div class="use-cases">
            {#each protocol.use_cases as uc}
              {#if hasText(uc)}<span class="use-case-tag">{uc}</span>{/if}
            {/each}
          </div>
        </div>
      {/if}

      {#if hasRisks(protocol.risks)}
        <div class="risks-section">
          <h3 class="section-label">Risks</h3>
          <div class="risk-cards">
            {#if hasText(protocol.risks.contract)}
              <div class="risk-card"><div class="risk-header"><span class="risk-type">Contract</span></div><p class="risk-text">{protocol.risks.contract}</p></div>
            {/if}
            {#if hasText(protocol.risks.community)}
              <div class="risk-card"><div class="risk-header"><span class="risk-type">Community</span></div><p class="risk-text">{protocol.risks.community}</p></div>
            {/if}
            {#if hasText(protocol.risks.structural)}
              <div class="risk-card"><div class="risk-header"><span class="risk-type">Structural</span></div><p class="risk-text">{protocol.risks.structural}</p></div>
            {/if}
          </div>
        </div>
      {/if}

      {#if hasForensics(protocol.forensics)}
        <div class="info-section detail-card">
          <h3 class="section-label">Onchain Forensics</h3>
          <div class="detail-list">
            {#if protocol.forensics.has_admin_functions !== null}
              <p class="section-text"><strong>{protocol.forensics.has_admin_functions ? "Has admin functions" : "No admin functions found"}</strong></p>
            {/if}
            {#if hasText(protocol.forensics.admin_function_notes)}<p class="supporting-text">{protocol.forensics.admin_function_notes}</p>{/if}
            {#if hasText(protocol.forensics.deployer_wallet_age)}<p class="section-text"><strong>Deployer wallet age:</strong> {protocol.forensics.deployer_wallet_age}</p>{/if}
            {#if protocol.forensics.deployer_prior_deploys !== null}<p class="section-text"><strong>Prior deploys:</strong> {protocol.forensics.deployer_prior_deploys}</p>{/if}
            {#if protocol.forensics.top_10_holder_concentration_pct !== null}<p class="section-text"><strong>Top 10 holder concentration:</strong> {protocol.forensics.top_10_holder_concentration_pct}%</p>{/if}
          </div>
        </div>
      {/if}

      {#if hasFunding(protocol.funding)}
        <div class="info-section detail-card">
          <h3 class="section-label">Funding</h3>
          {#if protocol.funding.has_funding_info === true}
            {#if hasItems(protocol.funding.investors)}<div class="use-cases">{#each protocol.funding.investors as investor}{#if hasText(investor)}<span class="use-case-tag">{investor}</span>{/if}{/each}</div>{/if}
            {#if hasText(protocol.funding.source_note)}<p class="supporting-text">{protocol.funding.source_note}</p>{:else if !hasItems(protocol.funding.investors)}<p class="section-text">Funding information found.</p>{/if}
          {:else if protocol.funding.has_funding_info === false}
            <p class="section-text">No public funding information found.</p>
            {#if hasText(protocol.funding.source_note)}<p class="supporting-text">{protocol.funding.source_note}</p>{/if}
          {/if}
        </div>
      {/if}

      {#if hasFounderHistory(protocol.founder_history)}
        <div class="info-section detail-card">
          <h3 class="section-label">Founder History</h3>
          {#if protocol.founder_history.prior_projects_found !== null}<p class="section-text"><strong>{protocol.founder_history.prior_projects_found ? "Prior projects found" : "No prior projects found"}</strong></p>{/if}
          {#if hasText(protocol.founder_history.details)}<p class="section-text">{protocol.founder_history.details}</p>{/if}
          {#if hasText(protocol.founder_history.confidence_note)}<p class="supporting-text">{protocol.founder_history.confidence_note}</p>{/if}
        </div>
      {/if}

      {#if hasTeam(protocol.team)}
        <div class="info-section">
          <h3 class="section-label">Team</h3>
          <div class="team-list">{#each protocol.team as member}{#if hasText(member.name) || hasText(member.role)}<div class="team-row"><strong>{member.name}</strong>{#if hasText(member.role)}<span>{member.role}</span>{/if}</div>{/if}{/each}</div>
          {#if hasText(protocol.team_as_of)}<p class="supporting-text">as of {protocol.team_as_of}</p>{/if}
        </div>
      {/if}

      {#if hasRestrictedJurisdictions(protocol.restricted_jurisdictions)}
        <div class="info-section">
          <h3 class="section-label">Restricted Jurisdictions</h3>
          <div class="use-cases"><span class="restricted-label">Not available in:</span>{#each protocol.restricted_jurisdictions as jurisdiction}{#if hasText(jurisdiction)}<span class="use-case-tag caution-tag">{jurisdiction}</span>{/if}{/each}</div>
        </div>
      {/if}

      {#if hasText(derivedAgeSummary(protocol))}
        <div class="info-section"><h3 class="section-label">Age</h3><p class="section-text">{derivedAgeSummary(protocol)}</p></div>
      {/if}

      {#if hasLinks(protocol.links)}
        <div class="links-section">
          <h3 class="section-label">Links</h3>
          <div class="link-list">
            {#if hasText(protocol.links.project)}
              <a href={protocol.links.project} target="_blank" rel="noreferrer" class="link-item" aria-label="Project website">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </a>
            {/if}
            {#if hasText(protocol.links.twitter)}
              <a href={protocol.links.twitter} target="_blank" rel="noreferrer" class="link-item" aria-label="Twitter"><svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
            {/if}
            {#if hasText(protocol.links.discord)}
              <a href={protocol.links.discord} target="_blank" rel="noreferrer" class="link-item" aria-label="Discord"><svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/></svg></a>
            {/if}
            {#if hasText(protocol.links.github)}
              <a href={protocol.links.github} target="_blank" rel="noreferrer" class="link-item" aria-label="GitHub"><span class="material-symbols-outlined" style="font-size:32px">code</span></a>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="floating-bar">
    <button class="commit-btn" onclick={handleCommit}>
      Commit
    </button>
  </div>

  {#if showStakeModal}
    <div class="modal-overlay" onclick={() => { showStakeModal = false; stakeConfirmed = false; }} role="presentation">
      <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') { showStakeModal = false; stakeConfirmed = false; } }} role="dialog" tabindex="-1">
        {#if !stakeConfirmed}
          <div class="modal-header">
            <h3 class="modal-title">Commit to {protocol.name}</h3>
            <p class="modal-period">{VERIFY_WINDOW_HOURS}h commitment window (3 checks)</p>
          </div>
          <p class="modal-desc">Stake MON to back your intention. We check your onchain activity every 72 hours — 3 times over 9 days. Engaged in time → your stake is returned. Miss all 3 checks → it's forfeited.</p>
          <div class="stake-input-group">
            <label for="stake-amount" class="stake-label">Stake Amount (MON)</label>
            <input id="stake-amount" type="number" bind:value={stakeAmount} min="0.001" step="0.001" class="stake-input" disabled={stakeLoading} />
          </div>
          {#if stakeError}
            <p class="stake-error">{stakeError}</p>
          {/if}
          <div class="modal-actions">
            <button class="modal-cancel" onclick={() => { showStakeModal = false; stakeConfirmed = false; stakeError = ""; }} disabled={stakeLoading}>Cancel</button>
            <button class="modal-confirm" onclick={confirmCommit} disabled={stakeLoading}>
              {stakeLoading ? "Staking..." : "Confirm & Stake"}
            </button>
          </div>
        {:else}
          <div class="modal-success-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <h3 class="modal-title" style="text-align:center;">Stake Confirmed</h3>
          <p class="modal-desc" style="text-align:center;">Your stake of {stakeAmount} MON has been committed to {protocol.name}. We'll check your activity at 72h, 144h, and 216h.</p>
          <p class="modal-deadline">Resolves automatically on {deadlineTimestamp}</p>
          <div class="modal-actions" style="justify-content:center;">
            <Link to="/myprotocols" class="modal-confirm" onclick={() => { showStakeModal = false; stakeConfirmed = false; }}>View in My Protocols</Link>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .protocol-page {
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
    padding: 32px 24px 120px;
    overflow-x: hidden;
  }
  .floating-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    display: flex;
    z-index: 50;
  }
  .floating-bar .commit-btn {
    width: 100%;
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    height: 20vw;
    background: #5D2CB2;
    border: none;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    font-family: var(--sans);
  }

  .profile-header {
    margin-bottom: 36px;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    position: relative;
  }
  .name-shield-row {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .protocol-logo {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
  }
  .fav-btn {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: transparent;
    border: none;
    color: #f5c518;
    cursor: pointer;
    font-family: var(--sans);
    line-height: 1;
  }
  .fav-btn .fav-star {
    font-size: 32px;
    color: #f5c518;
    line-height: 1;
  }
  .fav-btn:focus-visible {
    outline: 2px solid #f5c518;
    outline-offset: 2px;
    border-radius: 999px;
  }
  .protocol-name {
    font-size: 36px;
    font-weight: 800;
    margin: 0;
    color: var(--text);
    line-height: 1.1;
    letter-spacing: -0.5px;
  }
  .header-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .meta-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    background: var(--accent-bg);
    color: var(--accent);
    font-family: var(--mono);
    font-weight: 600;
  }
  .meta-badge.chain {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }
  .contract-address {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-muted);
    padding: 4px 8px;
    background: var(--surface-hover);
    border-radius: var(--radius-sm);
  }

  .profile-body {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .plain-summary-card {
    padding: 18px 20px;
    border: none;
    border-radius: var(--radius-lg);
    background: transparent;
  }
  .plain-summary-card p {
    margin: 0;
    color: var(--accent);
    font-size: 17px;
    line-height: 1.65;
    font-weight: 600;
  }
  .meta-row-section {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .verification-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    padding: 7px 12px;
    border-radius: var(--radius-sm);
    background: var(--surface-hover);
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 700;
  }
  .verification-badge.verified {
    background: var(--green-bg);
    color: var(--green);
  }
  .verification-badge.unverified {
    background: var(--unverified-bg);
    color: var(--unverified);
  }
  .verification-badge .material-symbols-outlined {
    font-size: 18px;
  }
  .contract-list, .detail-list, .team-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .contract-row, .team-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--surface-hover);
    border-radius: var(--radius-sm);
  }
  .contract-name, .team-row strong {
    color: var(--text);
    font-size: 14px;
    font-weight: 700;
  }
  .team-row span {
    color: var(--text-muted);
    font-size: 13px;
    text-align: right;
  }
  .text-toggle {
    align-self: flex-start;
    border: none;
    background: transparent;
    color: var(--accent);
    padding: 0;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .persona-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .persona-card, .detail-card {
    padding: 16px;
    background: var(--surface-hover);
    border-radius: var(--radius-md);
  }
  .persona-card.caution {
    background: var(--caution-bg);
    border: 1px solid var(--caution-border);
  }
  .supporting-text {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.55;
    margin: 0;
  }
  .restricted-label {
    color: var(--text-muted);
    font-size: 13px;
    align-self: center;
  }
  .caution-tag {
    background: var(--caution-tag-bg);
    color: var(--caution-tag);
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-label {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    color: var(--text);
  }
  .section-text {
    font-size: 15px;
    line-height: 1.65;
    color: var(--text-secondary);
    margin: 0;
  }
  .badge-top {
    flex-shrink: 0;
    align-self: center;
    transform: scale(0.7);
  }
  .use-cases {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .use-case-tag {
    font-size: 13px;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    background: var(--accent-bg);
    color: var(--accent);
    font-weight: 500;
  }
  .risks-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .risk-cards {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .risk-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .risk-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .risk-type {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .risk-text {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.55;
  }
  .links-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .link-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .link-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  .link-item:hover {
    background: var(--accent-bg);
  }
  .link-item .material-symbols-outlined {
    font-size: 16px;
  }

  .card-score {
    font-family: var(--mono);
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 32px;
    max-width: 420px;
    width: 90%;
    box-shadow: var(--shadow-xl);
  }
  .modal-header {
    margin-bottom: 12px;
  }
  .modal-title {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 4px;
    color: var(--text);
  }
  .modal-period {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    margin: 0;
  }
  .modal-desc {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .modal-deadline {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 20px;
    text-align: center;
    padding: 10px;
    background: var(--accent-bg);
    border-radius: var(--radius-sm);
  }
  .stake-input-group {
    margin-bottom: 20px;
  }
  .stake-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  .stake-input {
    width: 100%;
    padding: 12px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 16px;
    font-family: var(--mono);
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .stake-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .modal-cancel {
    padding: 10px 18px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    font-family: var(--sans);
    transition: background 0.2s;
  }
  .modal-cancel:hover {
    background: var(--border-light);
  }
  :global(.modal-confirm) {
    display: inline-flex;
    align-items: center;
    padding: 10px 18px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-full);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.2s;
  }
  :global(.modal-confirm:hover) {
    opacity: 0.9;
  }
  .modal-success-icon {
    text-align: center;
    margin-bottom: 12px;
  }
  .modal-success-icon .material-symbols-outlined {
    font-size: 48px;
    color: var(--green);
  }
  .stake-error {
    font-size: 13px;
    color: var(--rose);
    margin: 0 0 12px;
    padding: 8px 12px;
    background: var(--rose-bg);
    border-radius: var(--radius-sm);
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .protocol-loading {
    text-align: center;
    padding: 80px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .deep-research-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: var(--deep-research-bg);
    color: #fff;
    border-radius: var(--radius-md);
    margin-bottom: 24px;
    font-size: 14px;
    font-weight: 600;
  }
  .banner-icon {
    font-size: 20px;
    flex-shrink: 0;
  }
  .loading-icon {
    font-size: 40px;
    color: var(--accent);
  }
  .protocol-loading.error .loading-icon {
    color: var(--rose);
  }
  .loading-text {
    font-size: 15px;
    color: var(--text-muted);
    margin: 0;
  }
  .loading-sub {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
    opacity: 0.7;
  }
  .retry-btn {
    margin-top: 8px;
    padding: 10px 20px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--sans);
  }
  .spin {
    animation: spin 1.2s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .not-found {
    padding: 80px 24px;
    text-align: center;
  }
  .not-found-icon {
    font-size: 56px;
    color: var(--border);
    display: block;
    margin-bottom: 16px;
  }
  .not-found h2 {
    color: var(--text-muted);
    margin-bottom: 16px;
  }
  @media (min-width: 641px) {
    .floating-bar .commit-btn {
      height: 5vw;
    }
  }
</style>
