const config = {
  domain: "auth0.aws.peersyst.tech",
  clientId: "qOfA3FaWedmD9LjFS9uRvQVJ0U3XhsgA",
  audience: "fast-auth-api-test-0.com",
  mpcContractId: "v1.signer-prod.testnet",
  fastAuthContractId: "test-fa.testnet",
  get appOrigin() {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');
  }
};

export default config;