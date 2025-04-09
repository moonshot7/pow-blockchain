const fs = require('fs-extra');
const path = require('path');
const Block = require('./block');
const Transaction = require('./transaction');
const { BLOCK_REWARD, DIFFICULTY, DB_PATH } = require('../utils/config');

class Blockchain {
  constructor() {
    this.chain = [];
    this.mempool = [];
    this.difficulty = DIFFICULTY;
    
    // Create DB directory if it doesn't exist
    fs.ensureDirSync(DB_PATH);
    
    // Load blockchain from disk or create genesis block
    this.loadBlockchain();
  }

  // Create the genesis block
  createGenesisBlock() {
    const genesisTransaction = Transaction.createCoinbaseTransaction(
      "GENESIS_ADDRESS",
      100 // Initial supply
    );
    
    const genesisBlock = new Block(
      Date.now(),
      [genesisTransaction],
      "0", // No previous hash
      0 // Height = 0
    );
    
    genesisBlock.hash = genesisBlock.calculateHash();
    return genesisBlock;
  }

  // Get the latest block in the chain
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Add a block to the blockchain after validation
  addBlock(block) {
    // If this is not the genesis block, verify the previous hash
    if (block.height > 0) {
      block.previousHash = this.getLatestBlock().hash;
    }
    
    // Mine the block (perform PoW)
    block.mineBlock(this.difficulty);
    
    // Push the block to the chain
    this.chain.push(block);
    
    // Save the block to disk
    this.saveBlock(block);
    
    return block;
  }

  // Create a new block with transactions from mempool
  mineNewBlock(minerAddress) {
    // Sort transactions by fee (descending)
    const pendingTransactions = [...this.mempool].sort((a, b) => b.fee - a.fee);
    
    // Create coinbase transaction (mining reward)
    const coinbaseTransaction = Transaction.createCoinbaseTransaction(
      minerAddress,
      BLOCK_REWARD
    );
    
    // Add coinbase transaction to the beginning of block transactions
    const blockTransactions = [coinbaseTransaction, ...pendingTransactions];
    
    // Create a new block
    const newBlock = new Block(
      Date.now(),
      blockTransactions,
      this.getLatestBlock().hash,
      this.chain.length
    );
    
    // Add the block to the chain
    this.addBlock(newBlock);
    
    // Clear included transactions from mempool
    this.updateMempool(blockTransactions);
    
    return newBlock;
  }

  // Add a transaction to the mempool
  addTransaction(transaction) {
    // Validate transaction signature
    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to mempool');
    }
    
    // Skip validation for coinbase transactions
    if (transaction.type !== 'COINBASE') {
      // Check if sender has enough balance
      const senderBalance = this.getBalanceOfAddress(transaction.sender);
      
      if (senderBalance < transaction.amount + transaction.fee) {
        throw new Error('Not enough balance');
      }
    }
    
    // Add to mempool
    this.mempool.push(transaction);
    
    return true;
  }

  // Remove processed transactions from mempool
  updateMempool(processedTransactions) {
    const txIds = processedTransactions.map(tx => tx.id);
    this.mempool = this.mempool.filter(tx => !txIds.includes(tx.id));
  }

  // Calculate balance for a given wallet address
  getBalanceOfAddress(address) {
    let balance = 0;
    
    // Loop through all blocks
    for (const block of this.chain) {
      // Loop through all transactions in the block
      for (const trans of block.transactions) {
        // If this address is the sender, subtract the amount and fee
        if (trans.sender === address) {
          balance -= trans.amount;
          balance -= trans.fee;
        }
        
        // If this address is the recipient, add the amount
        if (trans.recipient === address) {
          balance += trans.amount;
        }
      }
    }
    
    return balance;
  }

  // Get all wallet addresses and their balances
  getAllBalances() {
    const balances = {};
    
    // Loop through all blocks
    for (const block of this.chain) {
      // Loop through all transactions in the block
      for (const tx of block.transactions) {
        // Add sender to balances if not exists
        if (tx.sender !== 'COINBASE' && !balances[tx.sender]) {
          balances[tx.sender] = 0;
        }
        
        // Add recipient to balances if not exists
        if (!balances[tx.recipient]) {
          balances[tx.recipient] = 0;
        }
        
        // Update balances
        if (tx.sender !== 'COINBASE') {
          balances[tx.sender] -= tx.amount;
          balances[tx.sender] -= tx.fee;
        }
        
        balances[tx.recipient] += tx.amount;
      }
    }
    
    return balances;
  }

  // Validate the blockchain
  isChainValid() {
    // Check genesis block
    const genesisBlock = this.chain[0];
    const validGenesis = genesisBlock.hash === genesisBlock.calculateHash();
    
    if (!validGenesis) {
      return false;
    }
    
    // Check the rest of the chain
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Validate block hashes
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
      
      // Validate previous hash references
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
      
      // Validate all transactions in the block
      if (!currentBlock.hasValidTransactions()) {
        return false;
      }
    }
    
    return true;
  }

  // Save block to disk
  saveBlock(block) {
    const blockPath = path.join(DB_PATH, `block_${block.height}.json`);
    fs.writeFileSync(blockPath, JSON.stringify(block, null, 2));
  }

  // Load blockchain from disk
  loadBlockchain() {
    try {
      const files = fs.readdirSync(DB_PATH);
      const blockFiles = files.filter(file => file.startsWith('block_')).sort((a, b) => {
        const heightA = parseInt(a.split('_')[1]);
        const heightB = parseInt(b.split('_')[1]);
        return heightA - heightB;
      });
      
      if (blockFiles.length === 0) {
        // No blocks found, create genesis block
        const genesisBlock = this.createGenesisBlock();
        this.chain.push(genesisBlock);
        this.saveBlock(genesisBlock);
      } else {
        // Load blocks from disk
        blockFiles.forEach(file => {
          const blockData = fs.readFileSync(path.join(DB_PATH, file), 'utf8');
          const blockObj = JSON.parse(blockData);
          
          // Create a new Block instance from the stored data
          const block = new Block(
            blockObj.timestamp,
            blockObj.transactions,
            blockObj.previousHash,
            blockObj.height
          );
          
          block.nonce = blockObj.nonce;
          block.hash = blockObj.hash;
          
          this.chain.push(block);
        });
      }
      
      console.log(`Blockchain loaded with ${this.chain.length} blocks`);
    } catch (error) {
      console.error('Error loading blockchain:', error);
      
      // Create genesis block if loading failed
      const genesisBlock = this.createGenesisBlock();
      this.chain.push(genesisBlock);
      this.saveBlock(genesisBlock);
    }
  }
}

module.exports = Blockchain;