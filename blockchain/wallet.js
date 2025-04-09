const fs = require('fs-extra');
const path = require('path');
const { generateKeyPair, createAddress } = require('../utils/crypto-utils');

class Wallet {
  constructor(privateKey = null) {
    if (privateKey) {
      this.loadWallet(privateKey);
    } else {
      this.createWallet();
    }
  }

  createWallet() {
    const keyPair = generateKeyPair();
    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;
    this.address = createAddress(this.publicKey);
  }

  loadWallet(privateKey) {
    const EC = require('elliptic').ec;
    const ec = new EC('secp256k1');
    const keyPair = ec.keyFromPrivate(privateKey);
    
    this.privateKey = privateKey;
    this.publicKey = keyPair.getPublic('hex');
    this.address = createAddress(this.publicKey);
  }

  getBalance(blockchain) {
    let balance = 0;
    
    // Go through all blocks in the blockchain
    for (const block of blockchain.chain) {
      // Check all transactions in the block
      for (const tx of block.transactions) {
        // If this wallet is the sender, subtract the amount
        if (tx.sender === this.publicKey) {
          balance -= tx.amount;
          balance -= tx.fee; // Subtract the transaction fee
        }
        
        // If this wallet is the recipient, add the amount
        if (tx.recipient === this.publicKey) {
          balance += tx.amount;
        }
        
        // If this wallet is the miner (coinbase transaction), add the reward
        if (tx.type === 'COINBASE' && tx.recipient === this.publicKey) {
          balance += tx.amount;
        }
      }
    }
    
    return balance;
  }

  static saveWallet(wallet, filename = 'wallet.json') {
    const walletData = {
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      address: wallet.address
    };
    
    fs.ensureDirSync('./wallets');
    fs.writeFileSync(path.join('./wallets', filename), JSON.stringify(walletData, null, 2));
  }

  static loadWalletFromFile(filename = 'wallet.json') {
    try {
      const walletData = fs.readFileSync(path.join('./wallets', filename), 'utf8');
      const { privateKey } = JSON.parse(walletData);
      return new Wallet(privateKey);
    } catch (e) {
      console.error('Failed to load wallet:', e.message);
      return null;
    }
  }
}

module.exports = Wallet;