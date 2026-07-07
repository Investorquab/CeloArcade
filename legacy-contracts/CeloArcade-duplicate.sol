// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * CeloArcade — Onchain Game Hub
 * Pure CELO. No cUSD needed.
 * Contract sponsors gas for new wallets.
 */
contract CeloArcade {

    address public owner;

    // ── CONSTANTS ──────────────────────────────────────────
    uint256 public welcomeGas     = 0.05 ether;   // CELO sent to new wallets
    uint256 public minBet         = 0.001 ether;  // min game bet
    uint256 public maxBet         = 0.1 ether;    // max game bet
    uint256 public winMultiplier  = 180;           // 1.8x in %
    uint256 public houseEdge      = 5;             // 5% house cut

    // ── PLAYER STATE ───────────────────────────────────────
    struct Player {
        uint256 totalGames;
        uint256 totalWins;
        uint256 totalEarned;    // CELO earned lifetime
        uint256 xp;
        uint256 level;
        uint256 streak;
        uint256 lastPlayDay;
        uint256 referralCount;
        uint256 referralEarned;
        bool    bonusClaimed;
        address referredBy;
    }

    mapping(address => Player) public players;
    address[] public allPlayers;
    mapping(address => bool) public isRegistered;

    // ── 1v1 ROOMS ──────────────────────────────────────────
    struct Room {
        address creator;
        address challenger;
        uint256 bet;
        uint8   gameType;   // 0=quiz 1=predict 2=speed
        uint8   category;
        bool    active;
        bool    completed;
        address winner;
        uint256 createdAt;
    }

    mapping(bytes32 => Room) public rooms;
    bytes32[] public activeRoomIds;
    mapping(bytes32 => bool) public roomExists;

    // ── DAILY PREDICTIONS ──────────────────────────────────
    struct Prediction {
        string  question;
        uint8   result;        // 0=unset 1=yes 2=no
        uint256 yesPool;
        uint256 noPool;
        uint256 deadline;
        bool    resolved;
    }

    mapping(uint256 => Prediction) public predictions;
    mapping(uint256 => mapping(address => uint8))  public predVote;
    mapping(uint256 => mapping(address => uint256)) public predAmount;
    uint256 public predictionCount;

    // ── DAILY TRACKING ─────────────────────────────────────
    mapping(uint256 => mapping(address => uint256)) public dailyTx; // day → player → txCount
    mapping(uint256 => address[]) public dailyPlayers;

    // ── EVENTS ─────────────────────────────────────────────
    event PlayerJoined(address indexed player, uint256 bonus);
    event GamePlayed(address indexed player, uint8 gameType, uint256 bet, bool won, uint256 payout, uint256 xpGained);
    event RoomCreated(bytes32 indexed roomId, address creator, uint256 bet, uint8 gameType);
    event RoomJoined(bytes32 indexed roomId, address challenger);
    event RoomResolved(bytes32 indexed roomId, address winner, uint256 prize);
    event PredictionCreated(uint256 indexed id, string question);
    event PredictionVoted(uint256 indexed id, address player, uint8 side, uint256 amount);
    event PredictionResolved(uint256 indexed id, uint8 result);
    event XPGained(address indexed player, uint256 xp, uint256 newLevel);
    event StreakUpdated(address indexed player, uint256 streak);
    event ReferralEarned(address indexed referrer, address indexed referee, uint256 amount);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor() payable {
        owner = msg.sender;
    }

    receive() external payable {}

    // ── REGISTER / WELCOME BONUS ───────────────────────────
    function register(address referrer) external {
        require(!isRegistered[msg.sender], "Already registered");
        require(address(this).balance >= welcomeGas, "Pool empty");

        isRegistered[msg.sender] = true;
        allPlayers.push(msg.sender);

        Player storage p = players[msg.sender];
        p.bonusClaimed = true;
        p.level = 1;

        // Set referral
        if (referrer != address(0) && referrer != msg.sender && isRegistered[referrer]) {
            p.referredBy = referrer;
            players[referrer].referralCount++;
        }

        // Send welcome CELO for gas
        (bool ok,) = msg.sender.call{value: welcomeGas}("");
        require(ok, "Transfer failed");

        emit PlayerJoined(msg.sender, welcomeGas);
    }

    // ── SOLO GAME ──────────────────────────────────────────
    // gameType: 0=QuizBlitz 1=Predict 2=SpeedChallenge
    function playGame(
        uint8  gameType,
        uint8  category,
        bool   won,
        uint256 xpToAward
    ) external payable {
        require(isRegistered[msg.sender], "Register first");
        require(msg.value >= minBet && msg.value <= maxBet, "Invalid bet");
        require(gameType <= 2, "Invalid game");

        Player storage p = players[msg.sender];
        p.totalGames++;

        // Streak logic
        uint256 today = block.timestamp / 1 days;
        if (p.lastPlayDay == today - 1) {
            p.streak++;
            emit StreakUpdated(msg.sender, p.streak);
        } else if (p.lastPlayDay != today) {
            p.streak = 1;
        }
        p.lastPlayDay = today;

        // Daily tracking
        if (dailyTx[today][msg.sender] == 0) {
            dailyPlayers[today].push(msg.sender);
        }
        dailyTx[today][msg.sender]++;

        uint256 payout = 0;
        if (won) {
            p.totalWins++;

            // Base payout
            payout = (msg.value * winMultiplier) / 100;

            // Streak bonus
            if (p.streak >= 7) payout = payout * 120 / 100;
            else if (p.streak >= 3) payout = payout * 110 / 100;

            // House edge
            uint256 fee = (payout * houseEdge) / 100;
            payout -= fee;

            // Cap at balance
            if (payout > address(this).balance) payout = address(this).balance;

            p.totalEarned += payout;

            // Referral cut (3%)
            address ref = p.referredBy;
            if (ref != address(0)) {
                uint256 refCut = (payout * 3) / 100;
                if (refCut > 0 && address(this).balance >= payout + refCut) {
                    players[ref].referralEarned += refCut;
                    (bool refOk,) = ref.call{value: refCut}("");
                    if (refOk) emit ReferralEarned(ref, msg.sender, refCut);
                }
            }

            (bool ok,) = msg.sender.call{value: payout}("");
            require(ok, "Payout failed");
        }

        // XP system
        uint256 xp = xpToAward > 0 ? xpToAward : 10;
        if (won) xp = xp * 2;
        if (p.streak >= 3) xp = xp * 12 / 10;
        _addXP(msg.sender, xp);

        emit GamePlayed(msg.sender, gameType, msg.value, won, payout, xp);
    }

    function _addXP(address player, uint256 xp) internal {
        Player storage p = players[player];
        p.xp += xp;

        // Level up: every 500 XP
        uint256 newLevel = (p.xp / 500) + 1;
        if (newLevel > p.level) {
            p.level = newLevel;
        }
        emit XPGained(player, xp, p.level);
    }

    // ── 1v1 ROOMS ──────────────────────────────────────────
    function createRoom(uint8 gameType, uint8 category) external payable returns (bytes32) {
        require(isRegistered[msg.sender], "Register first");
        require(msg.value >= minBet, "Bet too low");

        bytes32 roomId = keccak256(abi.encodePacked(msg.sender, block.timestamp, gameType));
        require(!roomExists[roomId], "Room exists");

        rooms[roomId] = Room({
            creator: msg.sender,
            challenger: address(0),
            bet: msg.value,
            gameType: gameType,
            category: category,
            active: true,
            completed: false,
            winner: address(0),
            createdAt: block.timestamp
        });

        roomExists[roomId] = true;
        activeRoomIds.push(roomId);

        emit RoomCreated(roomId, msg.sender, msg.value, gameType);
        return roomId;
    }

    function joinRoom(bytes32 roomId) external payable {
        Room storage r = rooms[roomId];
        require(r.active && !r.completed, "Room not available");
        require(r.challenger == address(0), "Room full");
        require(msg.sender != r.creator, "Can't join own room");
        require(msg.value == r.bet, "Wrong bet amount");
        require(isRegistered[msg.sender], "Register first");

        r.challenger = msg.sender;
        emit RoomJoined(roomId, msg.sender);
    }

    function resolveRoom(bytes32 roomId, address winner) external {
        Room storage r = rooms[roomId];
        require(msg.sender == owner || msg.sender == r.creator, "Not authorized");
        require(!r.completed, "Already resolved");
        require(r.challenger != address(0), "No challenger");
        require(winner == r.creator || winner == r.challenger, "Invalid winner");

        r.completed = true;
        r.active = false;
        r.winner = winner;

        uint256 prize = r.bet * 2;
        uint256 fee = (prize * houseEdge) / 100;
        prize -= fee;

        (bool ok,) = winner.call{value: prize}("");
        require(ok, "Prize failed");

        _addXP(winner, 100);

        emit RoomResolved(roomId, winner, prize);
    }

    // ── PREDICTIONS ────────────────────────────────────────
    function createPrediction(string calldata question, uint256 duration) external onlyOwner {
        uint256 id = predictionCount++;
        predictions[id] = Prediction({
            question: question,
            result: 0,
            yesPool: 0,
            noPool: 0,
            deadline: block.timestamp + duration,
            resolved: false
        });
        emit PredictionCreated(id, question);
    }

    function votePrediction(uint256 id, uint8 side) external payable {
        require(isRegistered[msg.sender], "Register first");
        Prediction storage pred = predictions[id];
        require(!pred.resolved, "Already resolved");
        require(block.timestamp < pred.deadline, "Voting closed");
        require(side == 1 || side == 2, "Invalid side");
        require(predVote[id][msg.sender] == 0, "Already voted");
        require(msg.value >= minBet, "Bet too low");

        predVote[id][msg.sender] = side;
        predAmount[id][msg.sender] = msg.value;

        if (side == 1) pred.yesPool += msg.value;
        else pred.noPool += msg.value;

        uint256 today = block.timestamp / 1 days;
        dailyTx[today][msg.sender]++;

        emit PredictionVoted(id, msg.sender, side, msg.value);
    }

    function resolvePrediction(uint256 id, uint8 result) external onlyOwner {
        require(result == 1 || result == 2, "Invalid result");
        Prediction storage pred = predictions[id];
        require(!pred.resolved, "Already resolved");

        pred.result = result;
        pred.resolved = true;
        emit PredictionResolved(id, result);
    }

    function claimPrediction(uint256 id) external {
        Prediction storage pred = predictions[id];
        require(pred.resolved, "Not resolved");
        require(predVote[id][msg.sender] == pred.result, "Wrong side");
        require(predAmount[id][msg.sender] > 0, "Nothing to claim");

        uint256 userBet = predAmount[id][msg.sender];
        predAmount[id][msg.sender] = 0;

        uint256 winPool = pred.result == 1 ? pred.yesPool : pred.noPool;
        uint256 losePool = pred.result == 1 ? pred.noPool : pred.yesPool;
        uint256 totalPool = winPool + losePool;

        uint256 share = (userBet * totalPool) / winPool;
        uint256 fee = (share * houseEdge) / 100;
        share -= fee;

        if (share > address(this).balance) share = address(this).balance;

        _addXP(msg.sender, 50);
        (bool ok,) = msg.sender.call{value: share}("");
        require(ok, "Claim failed");
    }

    // ── VIEWS ───────────────────────────────────────────────
    function getPlayer(address addr) external view returns (
        uint256 totalGames, uint256 totalWins, uint256 totalEarned,
        uint256 xp, uint256 level, uint256 streak,
        uint256 referralCount, bool bonusClaimed
    ) {
        Player storage p = players[addr];
        return (p.totalGames, p.totalWins, p.totalEarned, p.xp, p.level,
                p.streak, p.referralCount, p.bonusClaimed);
    }

    function getLeaderboard(uint256 limit) external view returns (
        address[] memory addrs, uint256[] memory xps, uint256[] memory levels, uint256[] memory games
    ) {
        uint256 count = allPlayers.length < limit ? allPlayers.length : limit;
        addrs  = new address[](count);
        xps    = new uint256[](count);
        levels = new uint256[](count);
        games  = new uint256[](count);

        address[] memory sorted = new address[](allPlayers.length);
        for (uint i = 0; i < allPlayers.length; i++) sorted[i] = allPlayers[i];

        for (uint i = 0; i < count; i++) {
            for (uint j = i + 1; j < sorted.length; j++) {
                if (players[sorted[j]].xp > players[sorted[i]].xp) {
                    address tmp = sorted[i]; sorted[i] = sorted[j]; sorted[j] = tmp;
                }
            }
            addrs[i]  = sorted[i];
            xps[i]    = players[sorted[i]].xp;
            levels[i] = players[sorted[i]].level;
            games[i]  = players[sorted[i]].totalGames;
        }
    }

    function getActiveRooms() external view returns (bytes32[] memory) {
        uint256 cnt = 0;
        for (uint i = 0; i < activeRoomIds.length; i++) {
            if (rooms[activeRoomIds[i]].active && !rooms[activeRoomIds[i]].completed) cnt++;
        }
        bytes32[] memory result = new bytes32[](cnt);
        uint256 idx = 0;
        for (uint i = 0; i < activeRoomIds.length; i++) {
            if (rooms[activeRoomIds[i]].active && !rooms[activeRoomIds[i]].completed) {
                result[idx++] = activeRoomIds[i];
            }
        }
        return result;
    }

    function getPrediction(uint256 id) external view returns (
        string memory question, uint8 result, uint256 yesPool,
        uint256 noPool, uint256 deadline, bool resolved
    ) {
        Prediction storage p = predictions[id];
        return (p.question, p.result, p.yesPool, p.noPool, p.deadline, p.resolved);
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ── OWNER ───────────────────────────────────────────────
    function fund() external payable onlyOwner {}

    function setWelcomeGas(uint256 amount) external onlyOwner {
        welcomeGas = amount;
    }

    function withdraw(uint256 amount) external onlyOwner {
        (bool ok,) = owner.call{value: amount}("");
        require(ok);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
