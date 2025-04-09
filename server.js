const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const WebSocket = require('ws');

const Blockchain = require('./blockchain/blockchain');
const Transaction = require('./blockchain/transaction');
const Wallet = require('./blockchain/wallet');
const { verifySignature } = require('./utils/crypto-utils');
const config = require('./utils/config');

// Initialize the app
const app = express();
const PORT = config.PORT;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create blockchain instance
const blockchain = new Blockchain();

// Generate a wallet for the server
const serverWallet = new Wallet();
Wallet.saveWallet(serverWallet, 'server_wallet.json');
console.log('Server wallet created:', serverWallet.address);

// Store connected miners
const miners = [];

// Track the current mining cycle
let miningInterval = null;
let isMiningInProgress = false;

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ noServer: true });

// Broadcast updates to all connected clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send initial blockchain data
  ws.send(JSON.stringify({
    type: 'INIT',
    data: {
      chain: blockchain.chain,
      mempool: blockchain.mempool,
      balances: blockchain.getAllBalances()
    }
  }));
  
  // Handle client messages
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    if (data.type === 'REGISTER_MINER') {
      miners.push({
        id: data.id,
        ws
      });
      console.log(`Miner registered: ${data.id}`);
    }
    
    if (data.type === 'MINED_BLOCK' && isMiningInProgress) {
      const block = data.block;
      
      try {
        // Verify block
        const isValid = verifyBlock(block);
        
        if (isValid) {
          // Stop the mining round
          isMiningInProgress = false;
          clearTimeout(miningInterval);
          
          // Add the mined block to the blockchain
          blockchain.chain.push(block);
          blockchain.saveBlock(block);
          
          // Clear processed transactions from mempool
          blockchain.updateMempool(block.transactions);
          
          // Broadcast new block to all clients
          broadcast({
            type: 'NEW_BLOCK',
            data: {
              block,
              mempool: blockchain.mempool,
              balances: blockchain.getAllBalances()
            }
          });
          
          console.log(`Block added to chain: ${block.hash}`);
          
          // Start next mining round after the interval
          setTimeout(startMiningRound, config.BLOCK_INTERVAL_MS);
        }
      } catch (error) {
        console.error('Error processing mined block:', error);
      }
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    // Remove miner if it was registered
    const minerIndex = miners.findIndex(miner => miner.ws === ws);
    if (minerIndex !== -1) {
      miners.splice(minerIndex, 1);
    }
  });
});

// Verify a block
function verifyBlock(block) {
  // Check the previous hash matches the last block in our chain
  if (block.previousHash !== blockchain.getLatestBlock().hash) {
    return false;
  }
  
  // Verify block hash
  const calculatedHash = block.calculateHash();
  if (calculatedHash !== block.hash) {
    return false;
  }
  
  // Check hash meets difficulty requirement
  const target = Array(blockchain.difficulty + 1).join('0');
  if (block.hash.substring(0, blockchain.difficulty) !== target) {
    return false;
  }
  
  // Verify all transactions
  for (const tx of block.transactions) {
    if (tx.type !== 'COINBASE' && !tx.isValid()) {
      return false;
    }
  }
  
  return true;
}

// Start a mining round
function startMiningRound() {
  if (isMiningInProgress) return;
  
  isMiningInProgress = true;
  
  // Broadcast to all miners to start mining
  broadcast({
    type: 'START_MINING',
    data: {
      mempool: blockchain.mempool,
      previousHash: blockchain.getLatestBlock().hash,
      height: blockchain.chain.length,
      difficulty: blockchain.difficulty
    }
  });
  
  console.log('Mining round started');
  
  // Set timeout to force end of mining round
  miningInterval = setTimeout(() => {
    isMiningInProgress = false;
    console.log('Mining round timed out, starting next round');
    startMiningRound();
  }, config.BLOCK_INTERVAL_MS);
}

// API ENDPOINTS

// Get the full blockchain
app.get('/api/blockchain', (req, res) => {
  res.json(blockchain.chain);
});

// Get the mempool
app.get('/api/mempool', (req, res) => {
  res.json(blockchain.mempool);
});

// Get wallet balances
app.get('/api/balances', (req, res) => {
  res.json(blockchain.getAllBalances());
});

// Create a new transaction
app.post('/api/transaction', (req, res) => {
  try {
    const { sender, recipient, amount, fee, signature } = req.body;
    
    // Create a new transaction
    const transaction = new Transaction(sender, recipient, parseFloat(amount), parseFloat(fee));
    
    // Manually set the signature
    transaction.signature = signature;
    
    // Validate and add the transaction
    if (!transaction.isValid()) {
      return res.status(400).json({ error: 'Invalid transaction signature' });
    }
    
    // Check if sender has enough balance
    const senderBalance = blockchain.getBalanceOfAddress(sender);
    if (senderBalance < amount + fee) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Add to mempool
    blockchain.mempool.push(transaction);
    
    // Broadcast new transaction to all clients
    broadcast({
      type: 'NEW_TRANSACTION',
      data: {
        transaction,
        mempool: blockchain.mempool
      }
    });
    
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Generate a new wallet
app.post('/api/wallet', (req, res) => {
  try {
    const wallet = new Wallet();
    res.status(201).json({
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      address: wallet.address
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Start the first mining round after a short delay
  setTimeout(startMiningRound, 5000);
});

// Attach WebSocket server to HTTP server
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});