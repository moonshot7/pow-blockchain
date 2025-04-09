const crypto = require('crypto');

class Block {
  constructor(index, previousHash, timestamp, transactions, nonce, minerAddress) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.nonce = nonce;
    this.minerAddress = minerAddress;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const blockData = this.index + this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce + this.minerAddress;
    return crypto.createHash('sha256').update(blockData).digest('hex');
  }
}

module.exports = Block;
