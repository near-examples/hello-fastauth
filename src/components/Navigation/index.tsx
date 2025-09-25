import Image from "next/image";
import Link from "next/link";

import { useEffect, useState } from "react";

import NearLogo from "/public/near-logo.svg";
import { useFastAuth } from "@/hooks/use-fast-auth";
import assert from "assert";

export const Navigation = () => {
  const [action, setAction] = useState(() => () => {});
  const [label, setLabel] = useState("Loading...");
  const { isLoggedIn, client } = useFastAuth();

  console.log("client", client);

  useEffect(() => {
    if (!client) return;

    if (isLoggedIn) {
      setAction(() => signOut);
      setLabel(`Logout`);
    } else {
      setAction(() => signIn);
      setLabel("Login via FastAuth");
    }
  }, [isLoggedIn, client]);

  function signIn() {
    assert(client);

    client.login();
  }

  function signOut() {
    assert(client);

    client.logout();
  }

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid">
        <Link href="/" passHref legacyBehavior>
          <Image
            priority
            src={NearLogo}
            alt="NEAR"
            width="30"
            height="24"
            className="d-inline-block align-text-top"
          />
        </Link>
        <div className="navbar-nav pt-1">
          <button className="btn btn-secondary" onClick={action}>
            {label}
          </button>
        </div>
      </div>
    </nav>
  );
};
