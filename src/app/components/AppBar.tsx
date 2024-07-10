"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { FC } from "react";

export const AppBar: FC = () => {
  return (
        <div className="flex justify-end items-center gap-4 m-6 font-bold text-xl">
          <div className="hover:underline">
            <Link href="/burn-scams">Burn Scams</Link>
          </div>
          <div className="hover:underline">
            <Link href="/close-accounts">Close Accounts</Link>
          </div>
          <div className="hover:border-slate-900 rounded">
            <WalletMultiButton style={{}} />
          </div>
        </div>
  );
};