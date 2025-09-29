import {
  createContext,
  useContext,
} from "react";
import { Account } from "@near-js/accounts";
import { Provider } from "@near-js/providers";
import { FastAuthSigner } from "@fast-auth/browser";

interface FastAuthContextType {
  loading: boolean
  publicKey?: string;
  nearAccount?: Account,
  fastAuthSigner: FastAuthSigner,
  provider: Provider,
  processingTx: boolean,
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const FastAuthContext = createContext<FastAuthContextType>({
  loading: true,
  nearAccount: undefined,
  publicKey: undefined,
  processingTx: false,
  fastAuthSigner: {} as FastAuthSigner,
  provider: {} as Provider,
  signIn: async () => { },
  signOut: async () => { },
});

export function useFastAuth(): FastAuthContextType {
  const context = useContext(FastAuthContext);
  if (context === null) {
    throw new Error(
      "useFastAuthRelayer must be used within a FastAuthRelayerProvider"
    );
  }
  return context;
}
