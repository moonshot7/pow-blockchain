module.exports = {
    // Blockchain settings
    BLOCK_REWARD: 50,
    DIFFICULTY: 4,  // Number of leading zeros required in hash
    COIN_NAME: "uemfCoin",
    BLOCK_INTERVAL_MINUTES: 10, // 10 minutes by default
    BLOCK_INTERVAL_MS: 10 * 60 * 1000, // Converting minutes to milliseconds
    
    // Server settings
    PORT: 3000,
    
    // Database settings
    DB_PATH: './db',
    
    // Mining settings
    MINING_THREADS: 1
  };