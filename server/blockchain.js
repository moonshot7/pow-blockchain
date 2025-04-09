const Block = require('./block');
const fs = require('fs');
const path = require('path');

class Blockchain {
  constructor() {
    this.chain = [];
    this.mempool = [];
    this.difficulty = 3;
    this.blockReward = 50;
    this.loadChain();
  }

  loadChain() {
    const dir = path.join(__dirname, 'database');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const files = fs.readdirSync(dir);
    if (files.length === 0) {
      const genesis = new Block(0, '0', Date.now(), [], 0, 'COINBASE');
      this.chain.push(genesis);
      this.saveBlock(genesis);
    } else {
      for (const file of files) {
        const block = JSON.parse(fs.readFileSync(path.join(dir, file)));
        this.chain.push(block);
      }
    }
  }

  saveBlock(block) {
    const dir = path.join(__dirname, 'database');
    const file = path.join(dir, `${block.index}.json`);
    fs.writeFileSync(file, JSON.stringify(block, null, 2));
  }

  addTransaction(tx) {
    if (tx.isValid()) {
      this.mempool.push(tx);
      return true;
    }
    return false;
  }

  getBalances() {
    const balances = {};
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.sender !== 'COINBASE') {
          balances[tx.sender] = (balances[tx.sender] || 0) - (tx.amount + tx.fee);
        }
        balances[tx.recipient] = (balances[tx.recipient] || 0) + tx.amount;
      }
      balances[block.minerAddress] = (balances[block.minerAddress] || 0) + this.blockReward;
    }
    return balances;
  }

  addBlock(newBlock) {
    const lastBlock = this.chain[this.chain.length - 1];
    if (
      newBlock.previousHash === lastBlock.hash &&
      newBlock.hash.startsWith('0'.repeat(this.difficulty)) &&
      newBlock.hash === newBlock.hash
    ) {
      this.chain.push(newBlock);
      this.saveBlock(newBlock);
      this.mempool = [];
      return true;
    }
    return false;
  }
}

module.exports = Blockchain;
