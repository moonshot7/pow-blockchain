const { v4: uuidv4 } = require('uuid');
const { hash, signData, verifySignature } = require('../utils/crypto-utils');

class Transaction {
  constructor(sender, recipient, amount, fee = 0, type = 'REGULAR', signature = null) {
    this.id = uuidv4();
    this.timestamp = Date.now();
    this.sender = sender; // Public key of sender
    this.recipient = recipient; // Public key of recipient
    this.amount = amount;
    this.fee = fee;
    this.type = type; // 'REGULAR' or 'COINBASE'
    this.signature = signature;
  }

  // Calculate hash of the transaction (excluding the signature)
  calculateHash() {
    return hash({
      id: this.id,
      timestamp: this.timestamp,
      sender: this.sender,
      recipient: this.recipient,
      amount: this.amount,
      fee: this.fee,
      type: this.type
    });
  }

  // Sign the transaction using sender's private key
  sign(privateKey) {
    // Don't sign coinbase transactions
    if (this.type === 'COINBASE') return;
    
    // Get transaction data without signature
    const transactionData = {
      id: this.id,
      timestamp: this.timestamp,
      sender: this.sender,
      recipient: this.recipient,
      amount: this.amount,
      fee: this.fee,
      type: this.type
    };
    
    this.signature = signData(transactionData, privateKey);
  }

  // Verify transaction signature
  isValid() {
    // Coinbase transactions don't need verification
    if (this.type === 'COINBASE') return true;
    
    // If there's no sender (coinbase), or transaction has no signature, it's invalid
    if (!this.sender || !this.signature) return false;
    
    // Get transaction data without signature
    const transactionData = {
      id: this.id,
      timestamp: this.timestamp,
      sender: this.sender,
      recipient: this.recipient,
      amount: this.amount,
      fee: this.fee,
      type: this.type
    };
    
    return verifySignature(transactionData, this.signature, this.sender);
  }

  // Create a coinbase transaction (mining reward)
  static createCoinbaseTransaction(recipientAddress, amount) {
    const tx = new Transaction(
      "COINBASE", // Coinbase transactions have no sender
      recipientAddress,
      amount,
      0, // No fee for coinbase transactions
      'COINBASE'
    );
    return tx;
  }
}

module.exports = Transaction;