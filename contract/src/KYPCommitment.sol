// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title KYPCommitment
/// @notice Users stake MON against a commitment to engage with a protocol.
///         A trusted verifier (backend wallet) checks onchain activity and
///         either returns the stake (verified) or forfeits it to the
///         protocol pool (slashed) after the deadline passes.
///         Backend performs 3 verification checks (every 72h) over a 216h window.
contract KYPCommitment {
    enum Status {
        Active,
        Verified,
        Slashed
    }

    struct Commitment {
        address user;
        address protocolAddress;
        uint256 amount;
        uint256 commitTimestamp;
        uint256 verifyDeadline;
        Status status;
    }

    address public owner;
    address public verifier;

    uint256 public constant VERIFY_WINDOW = 216 hours;

    uint256 public nextCommitmentId;
    mapping(uint256 => Commitment) public commitments;

    /// @notice Total MON currently held on behalf of active (unresolved) commitments.
    ///         Kept separate from the contract's raw balance so `withdrawForfeited`
    ///         can never touch funds that still belong to a user.
    uint256 public activeStakedTotal;

    event Staked(
        uint256 indexed commitmentId,
        address indexed user,
        address indexed protocolAddress,
        uint256 amount,
        uint256 verifyDeadline
    );
    event Verified(uint256 indexed commitmentId, address indexed user, uint256 amountReturned);
    event Slashed(uint256 indexed commitmentId, address indexed user, uint256 amountForfeited);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyVerifier() {
        require(msg.sender == verifier, "not verifier");
        _;
    }

    constructor(address _verifier) {
        owner = msg.sender;
        verifier = _verifier;
    }

    /// @notice Stake MON against a commitment to engage with `protocolAddress`.
    /// @dev Any wallet can stake on behalf of itself. Deadline is fixed at
    ///      VERIFY_WINDOW from the block timestamp of the stake tx.
    function stake(address protocolAddress) external payable returns (uint256 commitmentId) {
        require(msg.value > 0, "stake must be > 0");
        require(protocolAddress != address(0), "invalid protocol address");

        commitmentId = nextCommitmentId++;

        commitments[commitmentId] = Commitment({
            user: msg.sender,
            protocolAddress: protocolAddress,
            amount: msg.value,
            commitTimestamp: block.timestamp,
            verifyDeadline: block.timestamp + VERIFY_WINDOW,
            status: Status.Active
        });

        activeStakedTotal += msg.value;

        emit Staked(commitmentId, msg.sender, protocolAddress, msg.value, block.timestamp + VERIFY_WINDOW);
    }

    /// @notice Called by the backend verifier once it has confirmed onchain
    ///         engagement (a tx from `user` to `protocolAddress` after commit).
    ///         Returns the full stake to the user.
    function verify(uint256 commitmentId) external onlyVerifier {
        Commitment storage c = commitments[commitmentId];
        require(c.status == Status.Active, "not active");
        require(block.timestamp <= c.verifyDeadline, "deadline passed, use slash");

        c.status = Status.Verified;
        activeStakedTotal -= c.amount;

        uint256 amount = c.amount;
        (bool sent, ) = payable(c.user).call{value: amount}("");
        require(sent, "return transfer failed");

        emit Verified(commitmentId, c.user, amount);
    }

    /// @notice Called by the backend verifier once the deadline has passed
    ///         with no confirmed engagement. Stake stays in the contract as
    ///         forfeited funds, withdrawable by the owner via withdrawForfeited.
    function slash(uint256 commitmentId) external onlyVerifier {
        Commitment storage c = commitments[commitmentId];
        require(c.status == Status.Active, "not active");
        require(block.timestamp > c.verifyDeadline, "deadline not passed yet");

        c.status = Status.Slashed;
        activeStakedTotal -= c.amount;

        emit Slashed(commitmentId, c.user, c.amount);
    }

    /// @notice Owner-only withdrawal of forfeited (slashed) funds. Cannot
    ///         withdraw more than the contract holds beyond active stakes,
    ///         so user funds for unresolved commitments are always safe.
    function withdrawForfeited(uint256 amount, address payable to) external onlyOwner {
        require(to != address(0), "invalid recipient");
        uint256 available = address(this).balance - activeStakedTotal;
        require(amount <= available, "exceeds forfeited balance");

        (bool sent, ) = to.call{value: amount}("");
        require(sent, "withdraw transfer failed");

        emit Withdrawn(to, amount);
    }

    /// @notice View helper: how much forfeited (withdrawable) balance currently sits in the contract.
    function forfeitedBalance() external view returns (uint256) {
        return address(this).balance - activeStakedTotal;
    }

    function setVerifier(address newVerifier) external onlyOwner {
        require(newVerifier != address(0), "invalid verifier");
        emit VerifierUpdated(verifier, newVerifier);
        verifier = newVerifier;
    }

    function getCommitment(uint256 commitmentId) external view returns (Commitment memory) {
        return commitments[commitmentId];
    }
}
