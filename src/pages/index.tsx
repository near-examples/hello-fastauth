import { Cards } from "@/components/Cards";

import { useEffect, useMemo, useState } from "react";
import styles from "@/styles/app.module.css";

import { HelloNearContract } from "@/config";
import { useFastAuth } from "@/hooks/use-fast-auth";
import assert from "assert";
import base58 from "bs58";
import { FastAuthSignature, FastAuthSigner } from "@fast-auth/browser";
import { randomBytes } from "crypto";
import {
  Account,
  KeyPairSigner,
  utils,
  transactions,
  providers,
} from "near-api-js";
import { KeyType } from "@near-js/crypto";
import { fastAuthContractId } from "@/auth_config.json";

function generateRandomAccountId(): string {
  const now = Date.now();
  const hexBytes = randomBytes(2).toString("hex");

  return `fastauth-${now}-${hexBytes}.testnet`;
}

function writeSignedAccountToLocalStorage(accountId: string): void {
  window.localStorage.setItem("fastauth:signed_account", accountId);
}

function readSignedAccountFromLocalStorage() {
  return window.localStorage.getItem("fastauth:signed_account");
}

const provider = new providers.JsonRpcProvider({
  url: "https://rpc.testnet.fastnear.com",
});

// TODO: Replace with your actual private key and account ID
const RELAYER_PRIVATE_KEY =
  "ed25519:5txww6eaySfKnDTXDRK7H425qpiTyk4biE6rPeC6qwdzYDv5Xw5S258yWXdafgdfwdEBcW3SvfKJ9L5BNVMnitmJ"; // Replace with your private key
const RELAYER_ACCOUNT_ID = "bosisthenear.testnet"; // Replace with your account ID

const relayerAccount = new Account(
  RELAYER_ACCOUNT_ID,
  provider,
  KeyPairSigner.fromSecretKey(RELAYER_PRIVATE_KEY)
);

export default function HelloNear() {
  const { publicKey, isLoggedIn, signer } = useFastAuth();

  const [signedAccountId, setSignedAccountId] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState(0n);

  const [greeting, setGreeting] = useState("loading...");
  const [newGreeting, setNewGreeting] = useState("");
  const [showSpinner, setShowSpinner] = useState(false);

  const [status, setStatus] = useState("");

  async function updateGreeting(): Promise<void> {
    setShowSpinner(true);

    try {
      const text = await provider.callFunction(
        HelloNearContract,
        "get_greeting",
        {},
        { finality: "optimistic" }
      );

      setGreeting(text as string);
    } finally {
      setShowSpinner(false);
    }
  }

  useEffect(() => {
    updateGreeting();
  }, []);

  async function updateAccountBalance(accountId: string) {
    const { amount, locked } = await provider.viewAccount(accountId);

    setAccountBalance(amount - locked);
  }

  useEffect(() => {
    if (typeof signedAccountId !== "string") return;

    updateAccountBalance(signedAccountId);

    return () => {
      setAccountBalance(0n);
    };
  }, [signedAccountId]);

  const isBalanceSufficient =
    accountBalance > BigInt(utils.format.parseNearAmount("0.001")!);

  useEffect(() => {}, [isLoggedIn, isBalanceSufficient]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const accountId = readSignedAccountFromLocalStorage();

    if (!accountId) return;

    setSignedAccountId(accountId);
  }, [isLoggedIn]);

  async function saveGreeting() {
    assert(signedAccountId);
    assert(publicKey);

    assert(signer);

    setStatus(`Creating transaction`);

    const { nonce, block_hash: blockHash } = await provider.viewAccessKey(
      signedAccountId,
      publicKey
    );

    const tx = transactions.createTransaction(
      signedAccountId,
      utils.PublicKey.fromString(publicKey),
      HelloNearContract,
      nonce + 1n,
      [
        transactions.functionCall(
          "set_greeting",
          {
            greeting: newGreeting,
          },
          30_000_000_000_000n,
          0n
        ),
      ],
      base58.decode(blockHash)
    );

    setStatus(`Requesting transaction confirmation from Auth0`);

    await signer.requestTransactionSignature({
      redirectUri: "http://localhost:3000",
      imageUrl:
        "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
      name: "Peersyst Technology",
      transaction: tx,
    });
  }

  async function createAccount() {
    assert(publicKey);

    setShowSpinner(true);

    try {
      const newAccountId = generateRandomAccountId();

      const { status } = await relayerAccount.createAccount(
        newAccountId,
        publicKey,
        utils.format.parseNearAmount("0.005")!
      );

      if (!Object.prototype.hasOwnProperty.call(status, "SuccessValue")) return;

      writeSignedAccountToLocalStorage(newAccountId);
      setSignedAccountId(newAccountId);
    } finally {
      setShowSpinner(false);
    }
  }

  async function sendSignedTransaction(signer: FastAuthSigner) {
    const signatureRequest = await signer.getSignatureRequest();

    if (typeof signatureRequest.signPayload === "undefined") return;

    setShowSpinner(true);
    setStatus(
      `Requesting FastAuth contract to generate a signature for transaction`
    );

    try {
      const result = await relayerAccount.callFunction({
        contractId: fastAuthContractId,
        methodName: "sign",
        args: {
          guard_id: signatureRequest.guardId,
          verify_payload: signatureRequest.verifyPayload,
          sign_payload: signatureRequest.signPayload,
        },
        deposit: utils.format.parseNearAmount("0.01")!,
        gas: 300_000_000_000_000n,
      });

      if (!result) throw new Error(`Signature wasn't generated`);

      setStatus(`Parsing signature from response`);

      // @ts-expect-error result is of expected shape
      const signatureResponse = new FastAuthSignature(result);
      const tx = transactions.Transaction.decode(signatureRequest.signPayload);

      const signedTransaction = new transactions.SignedTransaction({
        transaction: tx,
        signature: new transactions.Signature({
          keyType: KeyType.SECP256K1,
          data: signatureResponse.recover(),
        }),
      });

      setStatus(`Sending signed transaction to update greeting`);

      const { transaction } = await provider.sendTransaction(signedTransaction);

      setStatus(`Transaction is sent - ${transaction.hash}`);

      await updateGreeting();
    } finally {
      setShowSpinner(false);
    }
  }

  useEffect(() => {
    if (!signer) return;

    sendSignedTransaction(signer);
  }, [signer]);

  const statusText = useMemo(() => {
    if (status) return status;

    if (!isLoggedIn) {
      return "";
    } else if (!signedAccountId) {
      return 'To continue with the example, please click "Create Account" button - this will generate an account linked to your FastAuth key.';
    } else if (!isBalanceSufficient) {
      return `To continue with the example, make sure your account has some NEAR tokens available. Please transfer at least 0.001 NEAR to your wallet before proceeding.`;
    }

    return `All set! Type your message in the input field and send it whenever you’re ready`;
  }, [status, isLoggedIn, isBalanceSufficient, signedAccountId]);

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          Interacting with the contract: &nbsp;
          <code className={styles.code}>{HelloNearContract}</code>
        </p>
        <div hidden={!isLoggedIn}>
          <p>
            Public Key: &nbsp;
            <code className={styles.code}>{publicKey!}</code>
          </p>
          {signedAccountId && (
            <>
              <p>
                Account: &nbsp;
                <code className={styles.code}>{signedAccountId!}</code>
              </p>
              <p>
                Balance: &nbsp;
                <code className={styles.code}>
                  {utils.format.formatNearAmount(accountBalance.toString(), 5)}{" "}
                  N
                </code>
              </p>
            </>
          )}
        </div>
      </div>

      <div className={styles.center}>
        <h1 className="w-100">
          The contract says: <code>{greeting}</code>
        </h1>
        <div className="input-group" hidden={!isLoggedIn || !signedAccountId}>
          <input
            type="text"
            className="form-control w-20"
            placeholder="Store a new greeting"
            onChange={(t) => setNewGreeting(t.target.value)}
            disabled={!isBalanceSufficient}
          />
          <div className="input-group-append">
            <button
              className="btn btn-secondary"
              disabled={!isBalanceSufficient}
              onClick={saveGreeting}
            >
              <span hidden={showSpinner}> Save </span>
              <i
                className="spinner-border spinner-border-sm"
                hidden={!showSpinner}
              ></i>
            </button>
          </div>
        </div>
        <div className="w-100 text-end align-text-center" hidden={isLoggedIn}>
          <p className="m-0"> Please login to change the greeting </p>
        </div>
        <div
          className="w-100 text-end align-text-center"
          hidden={!isLoggedIn || !!signedAccountId}
        >
          <button className="btn btn-secondary" onClick={createAccount}>
            <span hidden={showSpinner}>Create Account</span>
            <i
              className="spinner-border spinner-border-sm"
              hidden={!showSpinner}
            ></i>
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "12px",
        }}
        className="text-center"
        hidden={!isLoggedIn}
      >
        <span style={{}}>{statusText}</span>
      </div>
      <Cards />
    </main>
  );
}
