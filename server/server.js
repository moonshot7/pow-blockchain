// server/server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Blockchain = require('./blockchain');
const Transaction = require('./transaction');

const app = express();
const PORT = 3000;

const blockchain = new Blockchain();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../web-ui')));

// Get blockchain
app.get('/chain', (req, res) => {
  res.json(blockchain.chain);
});

// Get mempool
app.get('/mempool', (req, res) => {
  res.json(blockchain.mempool);
});

// Get wallet balances
app.get('/wallets', (req, res) => {
  res.json(blockchain.getBalances());
});

// Post transaction
app.post('/transaction', (req, res) => {
  const tx = new Transaction(req.body);
  const added = blockchain.addTransaction(tx);
  if (added) {
    res.status(200).send('Transaction accepted.');
  } else {
    res.status(400).send('Invalid transaction.');
  }
});

// Submit mined block
app.post('/block', (req, res) => {
  const { block } = req.body;
  const added = blockchain.addBlock(block);
  res.status(added ? 200 : 400).send(added ? 'Block accepted.' : 'Invalid block.');
});

// Start server
app.listen(PORT, () => {
  console.log(`Blockchain server running on http://localhost:${PORT}`);
});
