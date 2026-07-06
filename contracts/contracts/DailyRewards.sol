// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * DailyRewards — Top 10 players earn CELO every 24hrs
 * Owner submits top 10 addresses daily
 * Contract auto-distributes rewards
 * Creates daily tx burst — massive score boost
 */
contract DailyRewards {

    address public owner;

    uint256 public dailyPool     = 0.5 ether;  // 0.5 CELO split among top 10 daily
    uint256 public weeklyBonus   = 2 ether;    // 2 CELO for 7-day streak holders
    uint256 public lastDistributed;
    uint256 public distributionCount;
    uint256 public totalPaid;

    // Reward tiers (percentages of daily pool)
    uint256[10] public tiers = [25, 15, 12, 10, 9, 8, 7, 6, 5, 3]; // must sum to 100

    struct Distribution {
        address[10] winners;
        uint256[10] amounts;
        uint256 timestamp;
        uint256 day;
    }

    mapping(uint256 => Distribution) public distributions;
    mapping(address => uint256) public totalEarned;
    mapping(address => uint256) public lastWonDay;
    mapping(address => uint256) public winStreak;
    mapping(address => uint256[]) public winHistory;

    // Streak tracking
    mapping(address => uint256) public streakDays;
    mapping(address => uint256) public lastStreakDay;

    address[] public allWinners;
    mapping(address => bool) public isWinner;

    event DailyDistributed(uint256 indexed day, address[10] winners, uint256[10] amounts);
    event WeeklyBonusPaid(address indexed player, uint256 amount, uint256 streak);
    event StreakUpdated(address indexed player, uint256 streak);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor() payable {
        owner = msg.sender;
        lastDistributed = block.timestamp;
    }

    receive() external payable {}

    // ── DAILY DISTRIBUTION ── owner calls this every 24hrs with top 10
    function distributeDaily(address[10] calldata winners) external onlyOwner {
        require(address(this).balance >= dailyPool, "Insufficient balance");
        require(block.timestamp >= lastDistributed + 20 hours, "Too soon"); // 20hr minimum

        uint256 today = block.timestamp / 1 days;
        uint256 distId = distributionCount++;
        lastDistributed = block.timestamp;

        uint256[10] memory amounts;

        for(uint i = 0; i < 10; i++) {
            address winner = winners[i];
            if(winner == address(0)) continue;

            uint256 amount = (dailyPool * tiers[i]) / 100;
            amounts[i] = amount;

            totalEarned[winner] += amount;
            totalPaid += amount;
            winHistory[winner].push(today);

            // Update streak
            if(lastWonDay[winner] == today - 1) {
                winStreak[winner]++;
            } else if(lastWonDay[winner] != today) {
                winStreak[winner] = 1;
            }
            lastWonDay[winner] = today;

            if(!isWinner[winner]) {
                isWinner[winner] = true;
                allWinners.push(winner);
            }

            emit StreakUpdated(winner, winStreak[winner]);

            (bool ok,) = winner.call{value: amount}("");
            if(!ok) totalPaid -= amount;
        }

        distributions[distId] = Distribution({
            winners: winners,
            amounts: amounts,
            timestamp: block.timestamp,
            day: today
        });

        emit DailyDistributed(today, winners, amounts);

        // Auto-pay weekly bonus for 7-day streak holders
        _payWeeklyBonuses(winners);
    }

    function _payWeeklyBonuses(address[10] calldata winners) internal {
        if(address(this).balance < weeklyBonus) return;

        for(uint i = 0; i < 10; i++) {
            address w = winners[i];
            if(w == address(0)) continue;
            if(winStreak[w] > 0 && winStreak[w] % 7 == 0) {
                uint256 bonus = weeklyBonus / 5; // split bonus among eligible
                if(address(this).balance >= bonus) {
                    (bool ok,) = w.call{value: bonus}("");
                    if(ok) emit WeeklyBonusPaid(w, bonus, winStreak[w]);
                }
            }
        }
    }

    // ── VIEWS ──
    function getDistribution(uint256 id) external view returns (
        address[10] memory winners, uint256[10] memory amounts, uint256 timestamp
    ) {
        Distribution storage d = distributions[id];
        return (d.winners, d.amounts, d.timestamp);
    }

    function getPlayerStats(address player) external view returns (
        uint256 earned, uint256 streak, uint256 wins, uint256[] memory history
    ) {
        return (totalEarned[player], winStreak[player], winHistory[player].length, winHistory[player]);
    }

    function getStats() external view returns (
        uint256 balance, uint256 paid, uint256 distributions_, uint256 winners_
    ) {
        return (address(this).balance, totalPaid, distributionCount, allWinners.length);
    }

    function timeUntilNext() external view returns (uint256) {
        uint256 next = lastDistributed + 20 hours;
        if(block.timestamp >= next) return 0;
        return next - block.timestamp;
    }

    // ── OWNER ──
    function setDailyPool(uint256 amount) external onlyOwner { dailyPool = amount; }
    function setWeeklyBonus(uint256 amount) external onlyOwner { weeklyBonus = amount; }
    function fund() external payable onlyOwner {}
    function withdraw(uint256 amount) external onlyOwner {
        (bool ok,) = owner.call{value: amount}(""); require(ok);
    }
    function transferOwnership(address newOwner) external onlyOwner { owner = newOwner; }
}
