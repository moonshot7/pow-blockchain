// public/js/main.js
// Connect to WebSocket server
const ws = new WebSocket(`ws://${window.location.host}`);

// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const blockCount = document.getElementById('block-count');
const blocksList = document.getElementById('blocks-list');
const mempoolList = document.getElementById('mempool-list');
const walletsList = document.getElementById('wallets-list');
const generateWalletBtn = document.getElementById('generate-wallet-btn');
const newWalletInfo = document.getElementById('new-wallet-info');
const walletPublicKey = document.getElementById('wallet-public-key');
const walletPrivateKey = document.getElementById('wallet-private-key');
const walletAddress = document.getElementById('wallet-address');
const transactionForm = document.getElementById('transaction-form');
const transactionStatus = document.getElementById('transaction-status');

// Tab Navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabId = button.getAttribute('data-tab');
    
    // Hide all tab contents
    tabContents.forEach(content => {
      content.classList.remove('active');
    });
    
    // Remove active class from all buttons
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Show the selected tab content
    document.getElementById(tabId).classList.add('active');
    
    // Add active class to the clicked button
    button.classList.add('active');
  });
});

// Global state
let blockchain = [];
let mempool = [];
let balances = {};

// WebSocket events
ws.onopen = () => {
  connectionStatus.textContent = 'Connected';
  connectionStatus.style.color = '#2ecc71';
};

ws.onclose = () => {
  connectionStatus.textContent = 'Disconnected';
  connectionStatus.style.color = '#e74c3c';
};

ws.onerror = () => {
  connectionStatus.textContent = 'Connection Error';
  connectionStatus.style.color = '#e74c3c';
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'INIT':
      blockchain = message.data.chain;
      mempool = message.data.mempool;
      balances = message.data.balances;
      updateBlockchain();
      updateMempool();
      updateWalletsList();
      break;
      
    case 'NEW_BLOCK':
      blockchain.push(message.data.block);
      mempool = message.data.mempool;
      balances = message.data.balances;
      updateBlockchain();
      updateMempool();
      updateWalletsList();
      break;
      
    case 'NEW_TRANSACTION':
      mempool = message.data.mempool;
      updateMempool();
      break;
  }
};

// Update the blockchain display
function updateBlockchain() {
  blockCount.textContent = `Blocks: ${blockchain.length}`;
  blocksList.innerHTML = '';
  
  // Sort blockchain by height (descending)
  const sortedBlocks = [...blockchain].sort((a, b) => b.height - a.height);
  
  sortedBlocks.forEach(block => {
    const blockCard = document.createElement('div');
    blockCard.className = 'block-card';
    
    const blockHeader = document.createElement('div');
    blockHeader.className = 'block-header';
    
    const blockInfo = document.createElement('div');
    blockInfo.innerHTML = `
      <h3>Block #${block.height}</h3>
      <div class="block-hash">Hash: ${block.hash}</div>
      <div>Previous: ${block.previousHash.substring(0, 20)}...</div>
      <div>Nonce: ${block.nonce}</div>
    `;
    
    const blockTime = document.createElement('div');
    blockTime.className = 'block-timestamp';
    blockTime.textContent = new Date(block.timestamp).toLocaleString();
    
    blockHeader.appendChild(blockInfo);
    blockHeader.appendChild(blockTime);
    
    const blockTransactions = document.createElement('div');
    blockTransactions.className = 'block-transactions';
    
    if (block.transactions.length > 0) {
      const transactionTitle = document.createElement('h4');
      transactionTitle.textContent = `Transactions (${block.transactions.length})`;
      blockTransactions.appendChild(transactionTitle);
      
      block.transactions.forEach(tx => {
        const txItem = document.createElement('div');
        txItem.className = 'transaction-item';
        
        const txType = document.createElement('div');
        txType.className = `transaction-type ${tx.type.toLowerCase()}`;
        txType.textContent = tx.type;
        
        const txDetails = document.createElement('div');
        txDetails.className = 'transaction-details';
        
        txDetails.innerHTML = `
          <div>Sender:</div><span>${tx.sender === 'COINBASE' ? 'COINBASE' : tx.sender.substring(0, 20) + '...'}</span>
          <div>Recipient:</div><span>${tx.recipient.substring(0, 20)}...</span>
          <div>Amount:</div><span>${tx.amount} uemfCoin</span>
          <div>Fee:</div><span>${tx.fee} uemfCoin</span>
        `;
        
        txItem.appendChild(txType);
        txItem.appendChild(txDetails);
        blockTransactions.appendChild(txItem);
      });
    } else {
      const noTx = document.createElement('p');
      noTx.textContent = 'No transactions in this block';
      blockTransactions.appendChild(noTx);
    }
    
    blockCard.appendChild(blockHeader);
    blockCard.appendChild(blockTransactions);
    blocksList.appendChild(blockCard);
  });
}

// Update the mempool display
function updateMempool() {
  mempoolList.innerHTML = '';
  
  if (mempool.length === 0) {
    const noTx = document.createElement('p');
    noTx.textContent = 'No pending transactions';
    mempoolList.appendChild(noTx);
    return;
  }
  
  // Sort mempool by fee (descending)
  const sortedMempool = [...mempool].sort((a, b) => b.fee - a.fee);
  
  sortedMempool.forEach(tx => {
    const txItem = document.createElement('div');
    txItem.className = 'transaction-item';
    
    const txType = document.createElement('div');
    txType.className = 'transaction-type regular';
    txType.textContent = 'PENDING';
    
    const txDetails = document.createElement('div');
    txDetails.className = 'transaction-details';
    
    txDetails.innerHTML = `
      <div>Sender:</div><span>${tx.sender.substring(0, 20)}...</span>
      <div>Recipient:</div><span>${tx.recipient.substring(0, 20)}...</span>
      <div>Amount:</div><span>${tx.amount} uemfCoin</span>
      <div>Fee:</div><span>${tx.fee} uemfCoin</span>
      <div>Created:</div><span>${new Date(tx.timestamp).toLocaleString()}</span>
    `;
    
    txItem.appendChild(txType);
    txItem.appendChild(txDetails);
    mempoolList.appendChild(txItem);
  });
}

// Update wallets list
function updateWalletsList() {
  walletsList.innerHTML = '';
  
  // Convert balances object to array and sort by balance (descending)
  const walletEntries = Object.entries(balances).sort((a, b) => b[1] - a[1]);
  
  if (walletEntries.length === 0) {
    const noWallets = document.createElement('p');
    noWallets.textContent = 'No wallets found';
    walletsList.appendChild(noWallets);
    return;
  }
  
  walletEntries.forEach(([address, balance]) => {
    const walletCard = document.createElement('div');
    walletCard.className = 'wallet-card';
    
    const walletInfo = document.createElement('div');
    walletInfo.className = 'wallet-address';
    walletInfo.textContent = address;
    
    const walletBalance = document.createElement('div');
    walletBalance.className = 'wallet-balance';
    walletBalance.textContent = `${balance} uemfCoin`;
    
    walletCard.appendChild(walletInfo);
    walletCard.appendChild(walletBalance);
    walletsList.appendChild(walletCard);
  });
}

// Generate a new wallet
generateWalletBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/wallet', {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate wallet');
    }
    
    const wallet = await response.json();
    
    // Display wallet info
    walletPublicKey.textContent = wallet.publicKey;
    walletPrivateKey.textContent = wallet.privateKey;
    walletAddress.textContent = wallet.address;
    
    newWalletInfo.classList.remove('hidden');
  } catch (error) {
    console.error('Error generating wallet:', error);
    alert('Failed to generate wallet. Please try again.');
  }
});

// Crypto utility functions for the browser
function sha256(data) {
  // Convert the data to a string if it's not already
  const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
  
  // Create a buffer from the string
  const buffer = new TextEncoder().encode(dataString);
  
  // Hash the buffer
  return crypto.subtle.digest('SHA-256', buffer)
    .then(hash => {
      // Convert the hash to a hex string
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    });
}

// Helper function to sign transaction data
async function signTransaction(data, privateKey) {
  // This is a simplified version for demo purposes
  // In a real application, you would use proper digital signatures
  
  // For this demo, we'll use a hash of the data combined with the private key as the signature
  const combinedData = JSON.stringify(data) + privateKey;
  return await sha256(combinedData);
}

// Create and submit a transaction
transactionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const senderPublicKey = document.getElementById('sender-public-key').value;
  const senderPrivateKey = document.getElementById('sender-private-key').value;
  const recipientPublicKey = document.getElementById('recipient-public-key').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const fee = parseFloat(document.getElementById('fee').value);
  
  try {
    // Create transaction data
    const transactionData = {
      sender: senderPublicKey,
      recipient: recipientPublicKey,
      amount,
      fee,
      timestamp: Date.now()
    };
    
    // Sign the transaction
    const signature = await signTransaction(transactionData, senderPrivateKey);
    
    // Submit the transaction
    const response = await fetch('/api/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...transactionData,
        signature
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      transactionStatus.className = 'status-success';
      transactionStatus.textContent = 'Transaction submitted successfully!';
      transactionForm.reset();
    } else {
      transactionStatus.className = 'status-error';
      transactionStatus.textContent = `Error: ${result.error}`;
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    transactionStatus.className = 'status-error';
    transactionStatus.textContent = `Error: ${error.message}`;
  }
});