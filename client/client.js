const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const Block = require('../blockchain/block');
const Transaction = require('../blockchain/transaction');
const Wallet = require('../blockchain/wallet');
const config = require('../utils/config');

// Create a unique ID for this miner
const MINER_ID = uuidv4();

// Create or load a wallet
let minerWallet;
try {
  minerWallet = Wallet.loadWalletFromFile('miner_wallet.json');
  if (!minerWallet) {
    minerWallet = new Wallet();
    Wallet.saveWallet(minerWallet, 'miner_wallet.json');
  }
} catch (error) {
  minerWallet = new Wallet();
  Wallet.saveWallet(minerWallet, 'miner_wallet.json');
}

console.log(`Miner wallet: ${minerWallet.address}`);

// Connect to the blockchain server
const ws = new WebSocket(`ws://localhost:${config.PORT}`);

// Store blockchain data
let blockchain = [];
let mempool = [];
let isMining = false;

// Connect to the server
ws.on('open', () => {
  console.log('Connected to blockchain server');
  
  // Register as a miner
  ws.send(JSON.stringify({
    type: 'REGISTER_MINER',
    id: MINER_ID
  }));
});

// Handle messages from server
ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch (message.type) {
    case 'INIT':
      blockchain = message.data.chain;
      mempool = message.data.mempool;
      console.log(`Initialized with ${blockchain.length} blocks and ${mempool.length} transactions in mempool`);
      break;
      
    case 'START_MINING':
      if (!isMining) {
        isMining = true;
        mempool = message.data.mempool;
        const previousHash = message.data.previousHash;
        const height = message.data.height;
        const difficulty = message.data.difficulty;
        
        console.log(`Starting mining for block at height ${height}`);
        
        // Start mining in a separate thread
        setTimeout(() => {
          mineBlock(mempool, previousHash, height, difficulty);
        }, 0);
      }
      break;
      
    case 'NEW_BLOCK':
      blockchain.push(message.data.block);
      mempool = message.data.mempool;
      isMining = false;
      console.log(`New block added at height ${message.data.block.height}, hash: ${message.data.block.hash}`);
      break;
      
    case 'NEW_TRANSACTION':
      mempool = message.data.mempool;
      console.log(`New transaction added to mempool: ${message.data.transaction.id}`);
      break;
  }
});

// Handle connection errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from server');
  // Try to reconnect
  setTimeout(() => {
    console.log('Attempting to reconnect...');
    ws = new WebSocket(`ws://localhost:${config.PORT}`);
  }, 5000);
});

// Mine a block
function mineBlock(mempool, previousHash, height, difficulty) {
  if (!isMining) return;
  
  console.log('Mining process started...');
  
  try {
    // Get pending transactions from mempool, sorted by fee
    const pendingTransactions = [...mempool]
      .sort((a, b) => b.fee - a.fee)
      .slice(0, 10); // Limit to 10 transactions per block
    
    // Create coinbase transaction (mining reward)
    const coinbaseTransaction = Transaction.createCoinbaseTransaction(
      minerWallet.publicKey,
      config.BLOCK_REWARD
    );
    
    // Create block transactions starting with coinbase
    const blockTransactions = [coinbaseTransaction, ...pendingTransactions];
    
    // Create a new block
    const newBlock = new Block(
      Date.now(),
      blockTransactions,
      previousHash,
      height
    );
    
    // Mine the block
    console.log('Mining block...');
    newBlock.mineBlock(difficulty);
    
    console.log(`Block mined successfully: ${newBlock.hash}`);
    
    // Submit the mined block
    ws.send(JSON.stringify({
      type: 'MINED_BLOCK',
      block: newBlock
    }));
    
    isMining = false;
  } catch (error) {
    console.error('Mining failed:', error);
    isMining = false;
  }
}

// Helper function to create and submit transactions
function createTransaction(recipient, amount, fee) {
  try {
    const transaction = new Transaction(
      minerWallet.publicKey,
      recipient,
      parseFloat(amount),
      parseFloat(fee)
    );
    
    // Sign the transaction
    transaction.sign(minerWallet.privateKey);
    
    // Submit to the server
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: minerWallet.publicKey,
        recipient,
        amount: parseFloat(amount),
        fee: parseFloat(fee),
        signature: transaction.signature
      })
    };
    
    fetch(`http://localhost:${config.PORT}/api/transaction`, options)
      .then(response => response.json())
      .then(data => {
        console.log('Transaction created:', data);
      })
      .catch(error => {
        console.error('Error creating transaction:', error);
      });
      
  } catch (error) {
    console.error('Error creating transaction:', error);
  }
}

// Simple CLI menu
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n--- MINER CLIENT MENU ---');
  console.log('1. Create Transaction');
  console.log('2. Check Balance');
  console.log('3. Show My Wallet');
  console.log('4. Exit');
  
  rl.question('Select an option: ', (answer) => {
    switch (answer) {
      case '1':
        rl.question('Recipient public key: ', (recipient) => {
          rl.question('Amount: ', (amount) => {
            rl.question('Fee: ', (fee) => {
              createTransaction(recipient, amount, fee);
              showMenu();
            });
          });
        });
        break;
        
      case '2':
        fetch(`http://localhost:${config.PORT}/api/balances`)
          .then(response => response.json())
          .then(balances => {
            const myBalance = balances[minerWallet.publicKey] || 0;
            console.log(`Your balance: ${myBalance} ${config.COIN_NAME}`);
            showMenu();
          })
          .catch(error => {
            console.error('Error fetching balance:', error);
            showMenu();
          });
        break;
        
      case '3':
        console.log('--- YOUR WALLET ---');
        console.log(`Public Key: ${minerWallet.publicKey}`);
        console.log(`Private Key: ${minerWallet.privateKey}`);
        console.log(`Address: ${minerWallet.address}`);
        showMenu();
        break;
        
      case '4':
        console.log('Exiting...');
        rl.close();
        process.exit(0);
        break;
        
      default:
        console.log('Invalid option');
        showMenu();
        break;
    }
  });
}

// Start the menu after a delay
setTimeout(showMenu, 1000);