import type { FastAuthSigner } from "@fast-auth/browser";

import config from "@/auth_config";

import type { DelegateAction, SignedDelegate, Transaction } from "@near-js/transactions";
import { SignedMessage, Signer } from "@near-js/signers";

export class NAJSigner implements Signer {
  private faSigner: FastAuthSigner;

  constructor(faSigner: FastAuthSigner) {
    this.faSigner = faSigner;
  }

  async getPublicKey() {
    return this.faSigner.getPublicKey();
  }

  async signTransaction(transaction: Transaction) {
    console.log("Requesting signature for transaction:", transaction);
    const res = await this.faSigner.requestTransactionSignature({
      redirectUri: config.appOrigin,
      imageUrl:
        "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
      name: "Peersyst Technology",
      transaction,
    });
    console.log("Signed transaction:", res);

    return [undefined, await res];
  }

  async signNep413Message(
    message: string,
    accountId: string,
    recipient: string,
    nonce: Uint8Array<ArrayBufferLike>,
    callbackUrl?: string | undefined
  ): Promise<SignedMessage> {
    throw new Error("Method not implemented.");
  }

  async signDelegateAction(delegateAction: DelegateAction): Promise<[Uint8Array, SignedDelegate]> {
      throw new Error("Method not implemented.");
  }
}