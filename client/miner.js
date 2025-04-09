const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');

const mine = async () => {
  const mempool = (await axios.get('http://localhost:3000/mempool')).data;
  const lastBlock = (await axios.get('http://localhost:3000/chain')).data.slice(-1)[0];
  const minerAddress = fs.readFileSync('./client/keys/public.pem', 'utf-8');

  const candidate = {
    index: lastBlock.index + 1,
    previousHash: lastBlock.hash,
    timestamp: Date.now(),
    transactions: [
      { sender: 'COINBASE', recipient: minerAddress, amount: 50, fee: 0, signature: '' },
      ...mempool
    ],
    nonce: 0,
    minerAddress
  };

  while (true) {
    const blockString = JSON.stringify({ ...candidate, nonce: candidate.nonce });
    const hash = crypto.createHash('sha256').update(blockString).digest('hex');
    if (hash.startsWith('000')) {
      candidate.hash = hash;
      break;
    }
    candidate.nonce++;
  }

  const res = await axios.post('http://localhost:3000/block', { block: candidate });
  console.log(res.data);
};

mine();
