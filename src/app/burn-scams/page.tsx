"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { AUTHORITY, RPC_URL } from "@/utils/config";
import { useEffect, useState } from "react";
import { SCAM_TOKEN_LIST } from "@/utils/scamToken";
import { Loader } from "../components/Loader";
import {
  BURN_CU,
  CLOSE_ACCOUNT_CU,
  ADD_COMPUTE_UNIT_PRICE_CU,
  ADD_COMPUTE_UNIT_LIMIT_CU,
} from "@/utils/CUperInstructions";
import {
  createBurnInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import { MEMO_PROGRAM_ID } from "@solana/actions";
import { AppBar } from "../components/AppBar";

export default function Pages() {
  const connection = new Connection(RPC_URL);
  const { publicKey } = useWallet();
  const wallet = useWallet();
  const [userNFT, setUserNFT] = useState<
    | {
      mint: PublicKey;
      account: PublicKey;
      amount: number;
    }[]
  >([]);
  const [isFetched, setIsFetched] = useState<boolean>(false);
  const [isBurning, setIsBurning] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [bornSup, setBornSup] = useState<number>(0);
  const [leftToBurn, setLeftToBurn] = useState<number>(0);
  const burnPerTx = 10;

  async function getUserScamNFTs() {
    if (!wallet.publicKey) {
      setUserNFT([]);
      return;
    }
    setIsFetched(false);
    const account = wallet.publicKey;
    const tokenAccounts = await connection.getParsedProgramAccounts(
      new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      {
        commitment: "confirmed",
        filters: [
          {
            dataSize: 165,
          },
          {
            memcmp: {
              offset: 32,
              bytes: account.toBase58(),
            },
          },
        ],
      },
    );
    const scamTokens: {
      mint: PublicKey;
      account: PublicKey;
      amount: number;
    }[] = [];

    tokenAccounts.map((tokenAccount: any) => {
      const mint = tokenAccount.account?.data?.parsed?.info?.mint;
      const amount =
        tokenAccount.account?.data?.parsed?.info?.tokenAmount.amount;
      if (SCAM_TOKEN_LIST.includes(mint) && amount != 0) {
        const account = tokenAccount.pubkey;
        //@ts-ignore
        scamTokens.push({
          mint: new PublicKey(mint),
          account: account,
          amount: amount,
        });
      }
    });
    const _bornSup =
      scamTokens.length < burnPerTx ? scamTokens.length : burnPerTx;
    setBornSup(_bornSup);
    setUserNFT(scamTokens);
    setIsFetched(true);
    console.log(scamTokens);
  }

  useEffect(() => {
    getUserScamNFTs();
  }, [wallet.publicKey]);

  const burn = async () => {
    try {
      if (!publicKey) {
        throw new Error("Wallet is not Connected");
      }
      setIsBurning(true);
      setSuccess(false);
      const transaction = new Transaction().add(
        new TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from("burnt", "utf8"),
          keys: [],
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000,
        }),
        ComputeBudgetProgram.setComputeUnitLimit({
          units:
            bornSup * (BURN_CU + CLOSE_ACCOUNT_CU) +
            ADD_COMPUTE_UNIT_PRICE_CU +
            ADD_COMPUTE_UNIT_LIMIT_CU +
            3300,
        }),
      );

      const NON_MEMO_IX_INDEX = 1;

      // inject an authority key to track this transaction on chain
      transaction.instructions[NON_MEMO_IX_INDEX].keys.push({
        pubkey: AUTHORITY,
        isWritable: false,
        isSigner: false,
      });

      if (userNFT.length == 0) {
        setIsBurning(false);
        alert("You have no scam to burn!");
      } else {
        for (let i = 0; i < bornSup; i++) {
          transaction.add(
            createBurnInstruction(
              userNFT[i].account,
              userNFT[i].mint,
              publicKey,
              userNFT[i].amount,
            ),
          );
          transaction.add(
            createCloseAccountInstruction(
              userNFT[i].account,
              publicKey,
              publicKey,
            ),
          );
        }

        const signature = await wallet.sendTransaction(transaction, connection);
        console.log(signature);
        const confirmed = await connection.confirmTransaction(
          signature,
          "confirmed"
        );
        setLeftToBurn(userNFT.length - bornSup);
        setIsBurning(false);
        setSuccess(true);
        await getUserScamNFTs();
      }
    } catch (err) {
      setIsBurning(false);
      alert(err);
    }
  };

  return (
    <main className="">
      <AppBar/>
      <div className="flex items-center flex-col space-y-6 justify-center">
        <h2 className="font-heading mt-4 text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
          Burn Scams
        </h2>
        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
          Burn scam tokens & get SOL back. You will burn 10 scam tokens at a time and earn ~0.002 SOL per token.
        </p>

        <div className="flex items-center pt-[10%] flex-col space-y-6">
        {!isFetched && wallet.publicKey && (
          <div className="mt-2">
            <Loader text="Fetching scams..." />
          </div>
        )}
        {isFetched && wallet.publicKey && (
          <div className="mt-2">
            You have <span className="text-[#14F195] font-bold">{userNFT?.length}</span> scam(s) to burn! You will earn ~<span className="text-[#14F195] font-bold">{0.002 * userNFT?.length}</span> SOL.{" "}
          </div>
        )}

        {!isBurning ?
          <button
            onClick={burn}
            className={`px-2 py-2 bg-[#9945FF] font-bold rounded-lg ${!publicKey && "cursor-not-allowed disabled"}`}
          >
            Burn Scams
          </button>
          : <button
            className={`px-2 py-2 bg-[#9945FF] font-bold rounded-lg ${!publicKey && "cursor-not-allowed disabled"}`}
          >
            <svg
              role="status"
              className="inline mr-3 w-4 h-4 text-white animate-spin"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="#E5E7EB"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentColor"
              />
            </svg>Burning...
          </button>}
        {success && wallet.publicKey && <div className="font-bold text-xl">🎉 Burnt! {leftToBurn != 0 && `It remains ${leftToBurn} scam token(s) to burn`}</div>}
        {!wallet.publicKey && (
          <div className="font-bold text-xl">Please, connect your wallet!</div>
        )}
        </div>
      </div>
    </main>
  );
}
