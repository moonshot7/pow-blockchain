const Block = require('../blockchain/block');
const Transaction = require('../blockchain/transaction');
const { BLOCK_REWARD } = require('../utils/config');

class Miner {
  constructor(blockchain, wallet) {
    this.blockchain = blockchain;
    this.wallet = wallet;
    this.isMiningStopped = true;
  }

  // Start mining process
  startMining() {
    this.isMiningStopped = false;
    this.mine();
  }

  // Stop mining process
  stopMining() {
    this.isMiningStopped = true;
  }

  // Mine a new block
  mine() {
    if (this.isMiningStopped) return;
    
    console.log('Mining started...');
    
    try {
      // Get pending transactions from mempool, sorted by fee
      const pendingTransactions = [...this.blockchain.mempool]
        .sort((a, b) => b.fee - a.fee);
      
      // Create coinbase transaction (mining reward)
      const coinbaseTransaction = Transaction.createCoinbaseTransaction(
        this.wallet.publicKey,
        BLOCK_REWARD
      );
      
      // Create block transactions starting with coinbase
      const blockTransactions = [coinbaseTransaction, ...pendingTransactions];
      
      // Create a new block
      const newBlock = new Block(
        Date.now(),
        blockTransactions,
        this.blockchain.getLatestBlock().hash,
        this.blockchain.chain.length
      );
      
      // Mine the block
      newBlock.mineBlock(this.blockchain.difficulty);
      
      // Submit the mined block
      return newBlock;
    } catch (error) {
      console.error('Mining failed:', error);
      return null;
    }
  }
}

module.exports = Miner;