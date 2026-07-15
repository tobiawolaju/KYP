# KYP — Know Your Protocol

**Research it. Act on it. Prove you did.**

Built for the BuildAnything "Spark" hackathon on Monad.

---

## Inspiration

I'm a solo builder juggling multiple protocols, grants, and partnerships across the Monad ecosystem at once — new projects show up in my feed constantly, and my actual process for engaging with them looked like this: see a tweet, skim a site for 30 seconds, ape in or forget about it entirely. No real research, no plan, no record of whether I followed through.

The problem isn't a lack of information — it's that research, intention, and action live in three completely disconnected places (a Twitter bookmark, a mental note, and whatever I actually end up doing onchain, if anything). KYP exists to close that loop for myself first, and for anyone else doing the same thing.

## The Problem

Web3 engagement runs on vibes:

- You hear about a protocol and have no structured way to evaluate it beyond "gut feeling + Twitter hype"
- Even when you *do* decide to engage, there's no accountability — plans get made and quietly abandoned
- Follow-through is entirely self-reported, which means it's basically never checked

Information without action is entertainment. Intention without accountability is just a todo list you'll never open again.

## The Solution

KYP is a three-layer pipeline that takes you from a raw link to verified onchain action.

### 1. Research Layer
Paste anything you have on a protocol — a link, an X handle, a Discord invite, whatever. An agent pulls together what it can find: team background, links, latest news, and onchain signal where available. This compiles into a single-page profile with:
- A 0–50 score
- Who the protocol is actually for
- Clear use cases
- Risks flagged from what's visible onchain and structurally

### 2. Action Layer
Turns the research into concrete next steps — how to actually interact with the protocol, not just what it is (Information without action is Just Entertainment).

### 3. Consistency Layer
You decide: commit or don't. On commit, you stake a small amount of MON on Monad Testnet to back your intention. No self-reporting after that — instead of asking what you got done, KYP checks your **registered wallet** against onchain activity to verify you actually engaged. Real stake, real verification, no honor system.

## Why Onchain

The stake and the verification both live onchain by necessity — the entire point is replacing "trust me, I did it" with something checkable. A self-reported todo app doesn't solve the problem; a wallet that has to prove itself does.

## Tech Stack

- **Frontend:** React, deployed on Vercel
- **Backend:** Node.js, deployed on Render
- **Research agent:** custom tooling for protocol research and profile generation
- **Auth:** Firebase
- **Smart contracts:** Solidity, deployed on Monad Testnet (stake / commit / verify / slash)

## Status

Built solo, in public, during the Spark hackathon window (Jul 13–19, 2026).

## Links

- Live app: _[add on ship]_
- Demo video: _[add on ship]_
## Deployed Contracts (Monad Testnet)

### `KYPCommitment` — Official Submission
- File: `contract/src/KYPCommitment.sol`
- Address: `0xc5ebd0c77a1fd749bc2661e82c9682a1d53136e0`
- Explorer: https://testnet.monadvision.com/address/0xc5ebd0c77a1fd749bc2661e82c9682a1d53136e0
- Verify window: **72 hours**
- The real contract used in the KYP protocol. Deployed once and left untouched.

### `KYPCommitmentDemo` — Demo Only
- File: `contract/src/KYPCommitmentDemo.sol`
- Address: `0x98c3e4594ecfa1c45e8056932652b04cdea64e5d`
- Explorer: https://testnet.monadvision.com/address/0x98c3e4594ecfa1c45e8056932652b04cdea64e5d
- Verify window: **5 minutes**
- Identical logic to `KYPCommitment` but with a short verify window so the slash path can be exercised in a live demo video. **Not part of the actual submission.**_
