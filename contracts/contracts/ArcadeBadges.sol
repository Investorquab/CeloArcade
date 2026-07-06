// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ArcadeBadges — Onchain NFT milestone badges
 * Free to mint when player hits milestones
 * Each mint = 1 transaction = leaderboard points
 * Badges: First Game, Level 5, Level 10, 7-Day Streak, 50 Games, 100 Games
 */
contract ArcadeBadges {

    address public owner;
    address public arcadeContract; // CeloArcade contract address

    string public name   = "CeloArcade Badges";
    string public symbol = "BADGE";

    uint256 private _tokenIdCounter;

    // Badge types
    uint8 public constant BADGE_FIRST_GAME    = 1;
    uint8 public constant BADGE_LEVEL_5       = 2;
    uint8 public constant BADGE_LEVEL_10      = 3;
    uint8 public constant BADGE_STREAK_7      = 4;
    uint8 public constant BADGE_GAMES_50      = 5;
    uint8 public constant BADGE_GAMES_100     = 6;
    uint8 public constant BADGE_SPEED_KING    = 7;
    uint8 public constant BADGE_QUIZ_MASTER   = 8;
    uint8 public constant BADGE_EARLY_ADOPTER = 9;

    struct Badge {
        uint256 tokenId;
        address owner;
        uint8   badgeType;
        uint256 mintedAt;
        string  badgeName;
    }

    mapping(uint256 => Badge)            public badges;
    mapping(address => uint256[])        public playerBadges;
    mapping(address => mapping(uint8 => bool)) public hasBadge;
    mapping(uint8 => uint256)            public badgeSupply;
    mapping(uint8 => string)             public badgeNames;

    uint256 public totalMinted;
    address[] public allPlayers;
    mapping(address => bool) public isPlayer;

    event BadgeMinted(address indexed player, uint256 tokenId, uint8 badgeType, string badgeName);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor(address _arcadeContract) {
        owner = msg.sender;
        arcadeContract = _arcadeContract;

        // Set badge names
        badgeNames[BADGE_FIRST_GAME]    = "First Blood";
        badgeNames[BADGE_LEVEL_5]       = "Rising Star";
        badgeNames[BADGE_LEVEL_10]      = "Arcade Legend";
        badgeNames[BADGE_STREAK_7]      = "Week Warrior";
        badgeNames[BADGE_GAMES_50]      = "Dedicated Player";
        badgeNames[BADGE_GAMES_100]     = "Century Club";
        badgeNames[BADGE_SPEED_KING]    = "Speed King";
        badgeNames[BADGE_QUIZ_MASTER]   = "Quiz Master";
        badgeNames[BADGE_EARLY_ADOPTER] = "Early Adopter";
    }

    // ── MINT BADGE ── player calls this when they hit a milestone
    function mintBadge(uint8 badgeType) external {
        require(badgeType >= 1 && badgeType <= 9, "Invalid badge");
        require(!hasBadge[msg.sender][badgeType], "Already have this badge");

        uint256 tokenId = ++_tokenIdCounter;
        string memory bName = badgeNames[badgeType];

        badges[tokenId] = Badge({
            tokenId:   tokenId,
            owner:     msg.sender,
            badgeType: badgeType,
            mintedAt:  block.timestamp,
            badgeName: bName
        });

        playerBadges[msg.sender].push(tokenId);
        hasBadge[msg.sender][badgeType] = true;
        badgeSupply[badgeType]++;
        totalMinted++;

        if(!isPlayer[msg.sender]) {
            isPlayer[msg.sender] = true;
            allPlayers.push(msg.sender);
        }

        emit BadgeMinted(msg.sender, tokenId, badgeType, bName);
        emit Transfer(address(0), msg.sender, tokenId);
    }

    // ── BATCH MINT ── mint multiple badges at once (more txs per user)
    function mintBadges(uint8[] calldata badgeTypes) external {
        for(uint i = 0; i < badgeTypes.length; i++) {
            uint8 bt = badgeTypes[i];
            if(bt < 1 || bt > 9) continue;
            if(hasBadge[msg.sender][bt]) continue;

            uint256 tokenId = ++_tokenIdCounter;
            string memory bName = badgeNames[bt];

            badges[tokenId] = Badge({
                tokenId:   tokenId,
                owner:     msg.sender,
                badgeType: bt,
                mintedAt:  block.timestamp,
                badgeName: bName
            });

            playerBadges[msg.sender].push(tokenId);
            hasBadge[msg.sender][bt] = true;
            badgeSupply[bt]++;
            totalMinted++;

            if(!isPlayer[msg.sender]) {
                isPlayer[msg.sender] = true;
                allPlayers.push(msg.sender);
            }

            emit BadgeMinted(msg.sender, tokenId, bt, bName);
            emit Transfer(address(0), msg.sender, tokenId);
        }
    }

    // ── EARLY ADOPTER ── owner awards this to first 50 players
    function awardEarlyAdopter(address[] calldata players) external onlyOwner {
        for(uint i = 0; i < players.length; i++) {
            address p = players[i];
            if(hasBadge[p][BADGE_EARLY_ADOPTER]) continue;

            uint256 tokenId = ++_tokenIdCounter;
            badges[tokenId] = Badge({
                tokenId:   tokenId,
                owner:     p,
                badgeType: BADGE_EARLY_ADOPTER,
                mintedAt:  block.timestamp,
                badgeName: badgeNames[BADGE_EARLY_ADOPTER]
            });

            playerBadges[p].push(tokenId);
            hasBadge[p][BADGE_EARLY_ADOPTER] = true;
            badgeSupply[BADGE_EARLY_ADOPTER]++;
            totalMinted++;

            if(!isPlayer[p]) { isPlayer[p] = true; allPlayers.push(p); }

            emit BadgeMinted(p, tokenId, BADGE_EARLY_ADOPTER, badgeNames[BADGE_EARLY_ADOPTER]);
            emit Transfer(address(0), p, tokenId);
        }
    }

    // ── VIEWS ──
    function getPlayerBadges(address player) external view returns (uint256[] memory) {
        return playerBadges[player];
    }

    function getBadgeInfo(uint256 tokenId) external view returns (
        address owner_, uint8 badgeType, uint256 mintedAt, string memory badgeName
    ) {
        Badge storage b = badges[tokenId];
        return (b.owner, b.badgeType, b.mintedAt, b.badgeName);
    }

    function getEligibleBadges(address player, uint256 games, uint256 level, uint256 streak) 
        external view returns (uint8[] memory eligible) 
    {
        uint8[] memory temp = new uint8[](9);
        uint256 count = 0;

        if(games >= 1   && !hasBadge[player][BADGE_FIRST_GAME])    temp[count++] = BADGE_FIRST_GAME;
        if(level >= 5   && !hasBadge[player][BADGE_LEVEL_5])       temp[count++] = BADGE_LEVEL_5;
        if(level >= 10  && !hasBadge[player][BADGE_LEVEL_10])      temp[count++] = BADGE_LEVEL_10;
        if(streak >= 7  && !hasBadge[player][BADGE_STREAK_7])      temp[count++] = BADGE_STREAK_7;
        if(games >= 50  && !hasBadge[player][BADGE_GAMES_50])      temp[count++] = BADGE_GAMES_50;
        if(games >= 100 && !hasBadge[player][BADGE_GAMES_100])     temp[count++] = BADGE_GAMES_100;

        eligible = new uint8[](count);
        for(uint i = 0; i < count; i++) eligible[i] = temp[i];
    }

    function totalSupply() external view returns (uint256) { return totalMinted; }

    function getStats() external view returns (
        uint256 minted, uint256 players, uint256[9] memory supplies
    ) {
        uint256[9] memory s;
        for(uint8 i = 0; i < 9; i++) s[i] = badgeSupply[i+1];
        return (totalMinted, allPlayers.length, s);
    }

    // ── OWNER ──
    function setArcadeContract(address addr) external onlyOwner { arcadeContract = addr; }
    function transferOwnership(address newOwner) external onlyOwner { owner = newOwner; }
}
