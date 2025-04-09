const { hash } = require('../utils/crypto-utils');

class Block {
  constructor(timestamp, transactions, previousHash = '', height = 0) {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.height = height;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  // Calculate the hash of the block
  calculateHash() {
    return hash({
      timestamp: this.timestamp,
      transactions: this.transactions,
      previousHash: this.previousHash,
      height: this.height,
      nonce: this.nonce
    });
  }

  // Mine the block with the given difficulty
  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');
    
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    
    console.log(`Block mined: ${this.hash}`);
  }

  // Verify all transactions in the block
  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }
    return true;
  }
}

module.exports = Block;