"use client";

import { Navigation } from "@/components/Navigation";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { FastAuthProvider } from "@/context/provider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FastAuthProvider>
      <Navigation />
      <Component {...pageProps} />
    </FastAuthProvider>
  );
}
