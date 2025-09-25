import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  FastAuthClient,
  Auth0Provider,
  FastAuthSigner,
} from "@fast-auth/browser";
import config from "@/auth_config.json";
import { providers } from "near-api-js";

interface FastAuthContextType {
  client: FastAuthClient<Auth0Provider> | null;
  signer: FastAuthSigner | null;
  isClientInitialized: boolean;
  error: Error | null;
  isLoggedIn: boolean;
  publicKey: string | null;
}

async function getSignerSafely(client: FastAuthClient) {
  try {
    return await client.getSigner();
  } catch (error: unknown) {
    console.error(error);

    return undefined;
  }
}

const FastAuthContext = createContext<FastAuthContextType | null>(null);

export function FastAuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<FastAuthClient<Auth0Provider> | null>(
    null
  );
  const [signer, setSigner] = useState<FastAuthSigner | null>(null);
  const [isClientInitialized, setIsClientInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const provider = new Auth0Provider({
      domain: config.domain,
      clientId: config.clientId,
      redirectUri: config.appOrigin,
      audience: config.audience,
    });
    const client = new FastAuthClient(
      provider,
      {
        networkId: "testnet",
        // @ts-expect-error Provider is of similar shape
        provider: new providers.JsonRpcProvider({
          url: "https://rpc.testnet.fastnear.com",
        }),
      },
      {
        mpcContractId: config.mpcContractId,
        fastAuthContractId: config.fastAuthContractId,
      }
    );
    setClient(client);
    setIsClientInitialized(true);
  }, []);

  async function updateLoggedIn(client: FastAuthClient) {
    const signer = await getSignerSafely(client);

    if (!signer) {
      setSigner(null);
      setIsLoggedIn(false);
      setPublicKey(null);
      return;
    }

    setSigner(signer);

    const publicKey = await signer.getPublicKey();
    const pk = publicKey.toString();

    setIsLoggedIn(true);
    setPublicKey(pk);
  }

  useEffect(() => {
    if (!client) return;

    updateLoggedIn(client);
  }, [client]);

  return (
    <FastAuthContext.Provider
      value={{
        client,
        isClientInitialized,
        error,
        isLoggedIn,
        publicKey,
        signer,
      }}
    >
      {children}
    </FastAuthContext.Provider>
  );
}

export function useFastAuth(): FastAuthContextType {
  const context = useContext(FastAuthContext);
  if (context === null) {
    throw new Error(
      "useFastAuthRelayer must be used within a FastAuthRelayerProvider"
    );
  }
  return context;
}
