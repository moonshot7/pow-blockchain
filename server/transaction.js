const crypto = require('crypto');

class Transaction {
  constructor({ sender, recipient, amount, fee, signature }) {
    this.sender = sender;
    this.recipient = recipient;
    this.amount = amount;
    this.fee = fee;
    this.signature = signature;
  }

  isValid() {
    if (this.sender === 'COINBASE') return true;

    const verify = crypto.createVerify('SHA256');
    verify.update(this.sender + this.recipient + this.amount + this.fee);
    verify.end();
    return verify.verify(this.sender, this.signature, 'hex');
  }
}

module.exports = Transaction;
