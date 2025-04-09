const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const generateWallet = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 512,
  });

  const pubPem = publicKey.export({ type: 'pkcs1', format: 'pem' });
  const privPem = privateKey.export({ type: 'pkcs1', format: 'pem' });

  const walletPath = path.join(__dirname, '../client/keys');
  fs.writeFileSync(`${walletPath}/public.pem`, pubPem);
  fs.writeFileSync(`${walletPath}/private.pem`, privPem);
};

module.exports = { generateWallet };
