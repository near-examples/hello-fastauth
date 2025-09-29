import {
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  FastAuthClient,
  FastAuthSigner,
  Auth0Provider,
} from "@fast-auth/browser";
import config from "@/auth_config";
import { providers } from "near-api-js";
import { FastAuthContext } from "./useFastAuth";
import { Account } from "@near-js/accounts";
import { createAccount, recoverSignedTx } from "./relayer";

const a0Provider = new Auth0Provider({
  domain: config.domain,
  clientId: config.clientId,
  redirectUri: config.appOrigin,
  audience: config.audience,
});

const fastAuth = new FastAuthClient(
  a0Provider,
  {
    networkId: "testnet",
    provider: new providers.JsonRpcProvider({
      url: "https://test.rpc.fastnear.com",
    }),
  },
  {
    mpcContractId: config.mpcContractId,
    fastAuthContractId: config.fastAuthContractId,
  }
);

const provider = new providers.JsonRpcProvider({ url: "https://test.rpc.fastnear.com" });

export function FastAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [nearAccount, setNearAccount] = useState<Account | undefined>(undefined);
  const [publicKey, setPublicKey] = useState<string | undefined>(undefined);
  const [fastAuthSigner, setFASigner] = useState<FastAuthSigner | undefined>(undefined)
  const [processingTx, setProcessingTx] = useState(false);

  async function updateLoggedIn(fastAuth: FastAuthClient) {

    const faSigner = await fastAuth.getSigner().catch(() => undefined);

    if (!faSigner) {
      setPublicKey(undefined);
      setNearAccount(undefined);
      return;
    }

    const publicKey = await faSigner.getPublicKey();
    const pk = publicKey.toString();

    const accountId = await createAccount(pk, provider);

    const account = new Account(accountId, provider);
    setNearAccount(account);
    setPublicKey(pk);
    setFASigner(faSigner);
  }

  useEffect(() => {
    updateLoggedIn(fastAuth).finally(() => setLoading(false));
  }, []);

  const signIn = async () => {
    if (!fastAuth) return;
    fastAuth.login();
    await updateLoggedIn(fastAuth);
  };

  const signOut = async () => {
    if (!fastAuth) return;
    fastAuth.logout();
    await updateLoggedIn(fastAuth);
  };

  useEffect(() => {
    if (!fastAuthSigner) return;
    // check if there was a signature pending to be sent to the chain

    const check = async () => {
      const signatureRequest = await fastAuthSigner.getSignatureRequest();
      if (signatureRequest.signPayload) {
        setProcessingTx(true);

        const signedTransaction = await recoverSignedTx(signatureRequest, provider);
        await provider.sendTransaction(signedTransaction);
        setProcessingTx(false);
      }
    }

    check();
  }, [fastAuthSigner]);


  return (
    <FastAuthContext.Provider
      value={{
        loading,
        processingTx,
        nearAccount,
        fastAuthSigner,
        provider,
        publicKey,
        signIn,
        signOut,
      }}
    >
      {children}
    </FastAuthContext.Provider>
  );
}

