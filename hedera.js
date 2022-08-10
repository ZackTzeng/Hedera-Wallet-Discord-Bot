const { TokenAssociateTransaction, Client, AccountId, PrivateKey, PublicKey, TransferTransaction, TokenCreateTransaction, AccountBalanceQuery, AccountCreateTransaction, Hbar } = require("@hashgraph/sdk");

const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

function test(input) {
  return input + "--thank you for using hedera!";
}

async function queryAccountBalance(accountId, tokenId="hbar") {
  //Create the account balance query
  const query = await new AccountBalanceQuery()
    .setAccountId(accountId);

  //Submit the query to a Hedera network
  const accountBalance = await query.execute(client);

  //Print the balance of hbars
  // console.log("The hbar account balance for this account is " + accountBalance.hbars.toString());
	var balance;
	if (tokenId == "hbar") {
		balance = accountBalance.hbars.toString();
	} else {
		balance = accountBalance.tokens._map.get(tokenId.toString());
	}
	// console.log("balance ", balance)
  return balance.toString()
}

async function createAccount1(initialBalance) {

  //Create the transaction
  const transaction = new AccountCreateTransaction()
    .setKey(operatorKey.publicKey)
    .setInitialBalance(new Hbar(initialBalance));

  //Sign the transaction with the client operator private key and submit to a Hedera network
  const txResponse = await transaction.execute(client);

  //Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  //Get the account ID
  const newAccountId = receipt.accountId.toString();



  return newAccountId.toString()
}

async function createAccount(initialBalance) {
  var priKey = PrivateKey.generateED25519();
  var pubKey = priKey.publicKey;

  const newAccount = await new AccountCreateTransaction()
    .setKey(pubKey)
    .setInitialBalance(new Hbar(initialBalance))
    .execute(client);

  const receipt = await newAccount.getReceipt(client);

  //Get the account ID
  const accountId = receipt.accountId.toString();

  var activity = 0;

  return { activity, accountId, priKey, pubKey }
}

async function transferHbar(fromAccountId, fromPriKey, toAccountId, amount) {
  // Create a transaction to transfer 100 hbars
  console.log("fromAccountId ", fromAccountId)
  console.log("fromPriKey", fromPriKey);
  console.log("toAccountId", toAccountId)
  console.log("amount", amount)

  const sendHbarTx = await new TransferTransaction()
    .addHbarTransfer(fromAccountId, new Hbar(amount * -1)) //Sending account
    .addHbarTransfer(toAccountId, new Hbar(amount)) //Receiving account
    .freezeWith(client);

  const signTx = await sendHbarTx.sign(fromPriKey);
  const txResponse = await signTx.execute(client);
}

async function createToken(tokenName, tokenSymbol, decimal, initialSupply) {
  var createTokenTx = await new TokenCreateTransaction()
    .setTokenName(tokenName)
    .setTokenSymbol(tokenSymbol)
    .setDecimals(decimal)
    .setInitialSupply(initialSupply)
    .setTreasuryAccountId(operatorId)
    .execute(client);

  var createTxReceipt = await createTokenTx.getReceipt(client);
  var newTokenId = createTxReceipt.tokenId;

  console.log('new token id: ', newTokenId.toString());
  return newTokenId.toString()
}

async function transferToken(fromAccountId, fromPriKey, toAccountId, amount, tokenId) {

  console.log(fromAccountId, fromPriKey, toAccountId, amount, tokenId)
  console.log("fromAccountId ", fromAccountId)
  console.log("fromPriKey", fromPriKey);
  console.log("toAccountId", toAccountId)
  console.log("amount", amount)

  //Create the transfer transaction
  const transaction = new TransferTransaction()
    .addTokenTransfer(tokenId, fromtAccountId, amount * -1)
    .addTokenTransfer(tokenId, toAccountId, amount)
    .freezeWith(client);

  //Sign with the sender account private key
  console.log("from private key ", fromPriKey)
  const signTx = await transaction.sign(fromPriKey);

  //Sign with the client operator private key and submit to a Hedera network
  await signTx.execute(client);  
}

async function associateTokenWithAccount(accountId, priKey, tokenId) {
  //Associate a token to an account and freeze the unsigned transaction for signing
  const transaction = await new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds([tokenId])
    .freezeWith(client);

  //Sign with the private key of the account that is being associated to a token 
  const signTx = await transaction.sign(priKey);

  //Submit the transaction to a Hedera network    
  const txResponse = await signTx.execute(client);

  //Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  //Get the transaction consensus status
  const transactionStatus = receipt.status;

}

module.exports = { test, queryAccountBalance, transferToken, transferHbar, createAccount, operatorId, createToken };
