const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

const senderPrivate = crypto.createPrivateKey(fs.readFileSync('./client/keys/private.pem'));
const senderPublic = fs.readFileSync('./client/keys/public.pem', 'utf-8');

const recipient = '<Paste a recipient public key here>';
const amount = 10;
const fee = 1;

const sign = crypto.createSign('SHA256');
sign.update(senderPublic + recipient + amount + fee);
sign.end();
const signature = sign.sign(senderPrivate, 'hex');

const transaction = {
  sender: senderPublic,
  recipient,
  amount,
  fee,
  signature
};

axios.post('http://localhost:3000/transaction', transaction)
  .then(res => console.log(res.data))
  .catch(err => console.log(err.response.data));
