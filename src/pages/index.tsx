import { Cards } from "@/components/Cards";

import { useEffect, useState, useCallback } from "react";
import styles from "@/styles/app.module.css";

import { HelloNearContract } from "@/config";
import config from "@/auth_config";
import { useFastAuth } from "@/context/useFastAuth";
import { actionCreators } from "@near-js/transactions";
import { NEAR } from "@near-js/tokens";

export default function HelloNear() {
  const [greeting, setGreeting] = useState("loading...");
  const [newGreeting, setNewGreeting] = useState("");
  const [isLoggedIn, setLoggedIn] = useState(false)
  const [showSpinner, setShowSpinner] = useState(false);
  const [accountBalance, setAccountBalance] = useState("0");

  const { publicKey, nearAccount, provider, fastAuthSigner, processingTx } = useFastAuth();

  const fetchGreeting = useCallback(async () => {
    const greeting = await provider.callFunction(HelloNearContract, 'get_greeting', {}, { finality: "optimistic" })
    console.log("Greeting from contract:", greeting);
    setGreeting(greeting as string)
  }, [provider])

  const saveGreeting = async () => {
    if (!nearAccount) return;
    setShowSpinner(true)

    const tx = await nearAccount
      .createTransaction(
        HelloNearContract,
        [actionCreators.functionCall('set_greeting', { greeting: newGreeting }, 30000000000000n)],
        publicKey?.toString()!,
      )

    await fastAuthSigner.requestTransactionSignature({
      redirectUri: config.appOrigin,
      imageUrl:
        "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
      name: "Peersyst Technology",
      transaction: tx,
    });

    setShowSpinner(false)
  }

  useEffect(() => {
    setLoggedIn(!!nearAccount)

    if (nearAccount) {
      nearAccount.getBalance().then((balance) => {
        setAccountBalance(NEAR.toDecimal(balance, 2));
      });
    }
  }, [nearAccount])

  useEffect(() => {
    if (!processingTx) {
      setShowSpinner(false)
    } else {
      setShowSpinner(true)
    }
    fetchGreeting()
  }, [processingTx, fetchGreeting])


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
          {nearAccount && (
            <>
              <p>
                Account: &nbsp;
                <code className={styles.code}>{nearAccount.accountId}</code>
              </p>
              <p>
                Balance: &nbsp;
                <code className={styles.code}>
                  {accountBalance.toString()}{" "}
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
        <div className="input-group" hidden={!isLoggedIn || !nearAccount}>
          <input
            type="text"
            className="form-control w-20"
            placeholder="Store a new greeting"
            onChange={(t) => setNewGreeting(t.target.value)}
            disabled={showSpinner}
          />
          <div className="input-group-append">
            <button
              className="btn btn-secondary"
              onClick={saveGreeting}
              disabled={showSpinner || newGreeting.length === 0}
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
      </div>
      <Cards />
    </main>
  );
}
