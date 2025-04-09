const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1'); // Same curve used by Bitcoin

// Generate a key pair
function generateKeyPair() {
  const keyPair = ec.genKeyPair();
  return {
    privateKey: keyPair.getPrivate('hex'),
    publicKey: keyPair.getPublic('hex')
  };
}

// Hash data using SHA-256
function hash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// Sign a data object with private key
function signData(data, privateKey) {
  const dataHash = hash(data);
  const keyPair = ec.keyFromPrivate(privateKey);
  const signature = keyPair.sign(dataHash);
  return signature.toDER('hex');
}

// Verify signature with public key
function verifySignature(data, signature, publicKey) {
  try {
    const dataHash = hash(data);
    const key = ec.keyFromPublic(publicKey, 'hex');
    return key.verify(dataHash, signature);
  } catch (e) {
    return false;
  }
}

// Create a public address from public key (simulated)
function createAddress(publicKey) {
  // In a real blockchain, an address would be created through multiple hashing operations
  // For simplicity, we'll use a shortened version of the public key hash
  return hash(publicKey).substring(0, 40);
}

module.exports = {
  generateKeyPair,
  hash,
  signData,
  verifySignature,
  createAddress
};