import Image from "next/image";
import Link from "next/link";

import { useEffect, useState } from "react";

import NearLogo from "/public/near-logo.svg";
import { useFastAuth } from "@/context/useFastAuth";

export const Navigation = () => {
  const [action, setAction] = useState(() => () => {});
  const [label, setLabel] = useState("Loading...");
  const { nearAccount, loading, signIn, signOut } = useFastAuth();

  useEffect(() => {
    if (loading) return;

    if (nearAccount) {
      setAction(() => signOut);
      setLabel(`Logout ${nearAccount.accountId}`);
    } else {
      setAction(() => signIn);
      setLabel("Login via FastAuth");
    }
  }, [nearAccount, loading]);

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid">
        <Link href="/" passHref>
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
