async function fetchData() {
    const chain = await (await fetch('/chain')).json();
    const mempool = await (await fetch('/mempool')).json();
    const balances = await (await fetch('/wallets')).json();
  
    document.getElementById('blocks').innerHTML = '<h2>Blocks</h2>' + chain.map(b => `<pre>${JSON.stringify(b, null, 2)}</pre>`).join('');
    document.getElementById('mempool').innerHTML = '<h2>Mempool</h2>' + mempool.map(t => `<pre>${JSON.stringify(t, null, 2)}</pre>`).join('');
    document.getElementById('balances').innerHTML = '<h2>Wallets</h2><pre>' + JSON.stringify(balances, null, 2) + '</pre>';
  }
  
  setInterval(fetchData, 3000);
  fetchData();
  