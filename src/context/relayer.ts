
import { Account } from "@near-js/accounts";
import { Provider } from "@near-js/providers";
import { KeyPairSigner } from "@near-js/signers";
import { KeyPair, KeyType } from "@near-js/crypto";
import { NEAR } from "@near-js/tokens";
import { Signature, SignedTransaction, Transaction } from "@near-js/transactions";
import { createHash } from "crypto";
import config from "@/auth_config";
import { FastAuthSignature } from "@fast-auth/browser";

const RELAYER_PRIVATE_KEY = "ed25519:5txww6eaySfKnDTXDRK7H425qpiTyk4biE6rPeC6qwdzYDv5Xw5S258yWXdafgdfwdEBcW3SvfKJ9L5BNVMnitmJ"; // Replace with your private key
const RELAYER_ACCOUNT_ID = "bosisthenear.testnet"; // Replace with your account ID
const signer = new KeyPairSigner(KeyPair.fromString(RELAYER_PRIVATE_KEY))

export async function createAccount(publicKey: string, provider: Provider): Promise<string> {
  // Remove if fastauth ever migrates to ed25519 keys
  // hash the public key into 32 hex bytes and use that as the account name
  const hash = createHash("sha256").update(publicKey).digest("hex");
  const accountId = `fa-${hash.slice(0, 32)}.testnet`;

  try {
    await provider.viewAccount(accountId)
  } catch {
    // TODO: Use a real relayer service
    const relayer = new Account(RELAYER_ACCOUNT_ID, provider, signer);
    await relayer.createAccount(accountId, publicKey, NEAR.toUnits('0.01'));
  }
  return accountId;
}

export async function recoverSignedTx({ guardId, verifyPayload, signPayload }: any, provider: Provider): Promise<SignedTransaction> {
  const relayer = new Account(RELAYER_ACCOUNT_ID, provider, signer);
  const result = await relayer.callFunction({
    contractId: config.fastAuthContractId,
    methodName: "sign",
    args: {
      guard_id: guardId,
      verify_payload: verifyPayload,
      sign_payload: signPayload,
    },
    deposit: NEAR.toUnits("0.01"),
    gas: "300000000000000",
  })
  const signatureResponse = new FastAuthSignature(result);
  const transaction = Transaction.decode(signPayload);
  const signedTx = new SignedTransaction({
    transaction,
    signature: new Signature({
      keyType: KeyType.SECP256K1,
      data: signatureResponse.recover(),
    }),
  })

  return signedTx
}
