// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * CeloFaucet — New user onboarding
 * User submits their address on website
 * Owner (or bot) calls dispense() to send them CELO
 * User never needs CELO to start — we pay gas
 */
contract CeloFaucet {

    address public owner;
    uint256 public dispensAmount  = 0.5 ether;  // 0.5 CELO per claim
    uint256 public cooldown       = 7 days;      // can claim again after 7 days
    uint256 public maxPerDay      = 20;          // max 20 new users per day
    
    mapping(address => uint256) public lastClaim;
    mapping(address => uint256) public totalClaimed;
    mapping(address => bool)    public hasClaimed;
    
    uint256 public todayCount;
    uint256 public lastResetDay;
    uint256 public totalDispensed;
    
    address[] public allRecipients;

    event Dispensed(address indexed recipient, uint256 amount, bool isNew);
    event FundedBy(address indexed funder, uint256 amount);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor() payable { 
        owner = msg.sender;
        lastResetDay = block.timestamp / 1 days;
    }
    
    receive() external payable { emit FundedBy(msg.sender, msg.value); }

    // ── DISPENSE ── called by owner/bot when user submits address on site
    function dispense(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid address");
        require(address(this).balance >= dispensAmount, "Faucet empty");
        require(
            block.timestamp >= lastClaim[recipient] + cooldown || !hasClaimed[recipient],
            "Too soon to claim again"
        );

        // Reset daily counter
        uint256 today = block.timestamp / 1 days;
        if(today > lastResetDay) {
            todayCount = 0;
            lastResetDay = today;
        }
        require(todayCount < maxPerDay, "Daily limit reached");

        bool isNew = !hasClaimed[recipient];
        if(isNew) allRecipients.push(recipient);

        lastClaim[recipient]   = block.timestamp;
        hasClaimed[recipient]  = true;
        totalClaimed[recipient]+= dispensAmount;
        todayCount++;
        totalDispensed += dispensAmount;

        (bool ok,) = recipient.call{value: dispensAmount}("");
        require(ok, "Transfer failed");

        emit Dispensed(recipient, dispensAmount, isNew);
    }

    // ── BATCH DISPENSE ── send to multiple addresses at once
    function dispenseBatch(address[] calldata recipients) external onlyOwner {
        for(uint i = 0; i < recipients.length; i++) {
            address r = recipients[i];
            if(r == address(0)) continue;
            if(address(this).balance < dispensAmount) break;
            if(hasClaimed[r] && block.timestamp < lastClaim[r] + cooldown) continue;

            bool isNew = !hasClaimed[r];
            if(isNew) allRecipients.push(r);

            lastClaim[r]    = block.timestamp;
            hasClaimed[r]   = true;
            totalClaimed[r] += dispensAmount;
            totalDispensed  += dispensAmount;

            (bool ok,) = r.call{value: dispensAmount}("");
            if(ok) emit Dispensed(r, dispensAmount, isNew);
        }
    }

    // ── VIEWS ──
    function canClaim(address recipient) external view returns (bool, uint256 nextClaimTime) {
        if(!hasClaimed[recipient]) return (true, 0);
        uint256 next = lastClaim[recipient] + cooldown;
        return (block.timestamp >= next, next);
    }

    function getStats() external view returns (
        uint256 balance, uint256 dispensed, uint256 recipients, uint256 todayDispensed
    ) {
        return (address(this).balance, totalDispensed, allRecipients.length, todayCount);
    }

    function getAllRecipients() external view returns (address[] memory) {
        return allRecipients;
    }

    // ── OWNER ──
    function setDispenseAmount(uint256 amount) external onlyOwner { dispensAmount = amount; }
    function setCooldown(uint256 seconds_) external onlyOwner { cooldown = seconds_; }
    function setMaxPerDay(uint256 max) external onlyOwner { maxPerDay = max; }
    function fund() external payable onlyOwner {}
    function withdraw(uint256 amount) external onlyOwner {
        (bool ok,) = owner.call{value: amount}(""); require(ok);
    }
    function transferOwnership(address newOwner) external onlyOwner { owner = newOwner; }
}
