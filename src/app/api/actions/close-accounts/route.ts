import { ACTIONS_CORS_HEADERS, ActionGetResponse, ActionPostRequest, ActionPostResponse, MEMO_PROGRAM_ID, createPostResponse } from "@solana/actions";
import { ComputeBudgetProgram, Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createCloseAccountInstruction, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ADD_COMPUTE_UNIT_LIMIT_CU, ADD_COMPUTE_UNIT_PRICE_CU, CLOSE_ACCOUNT_CU } from "@/utils/CUperInstructions";
import { AUTHORITY, RPC_URL } from "@/utils/config";
import { getEmptyTokenAccounts } from "@/utils/getEmptyTokenAccounts";


export const GET = async (req: Request) => {
  const payload: ActionGetResponse = {
    title: "Close your empty token accounts",
    icon: new URL("/solanatools.jpg", new URL(req.url).origin).toString(),
    description: "Close your empty token accounts & get SOL back. You will close 20 empty token accounts at a time and earn ~0.002 SOL per account.",
    label: "Close Accounts",
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
};

export const OPTIONS = GET;


export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const connection = new Connection(RPC_URL);
    const closePerTx = 20;

    const emptyTokenAccountsRegular = await getEmptyTokenAccounts(account, connection, TOKEN_PROGRAM_ID);
    const emptyTokenAccounts2022 = await getEmptyTokenAccounts(account, connection, TOKEN_2022_PROGRAM_ID);

    const emptyTokenAccounts = emptyTokenAccountsRegular.concat(emptyTokenAccounts2022);

    console.log("Number of accounts to close: ", emptyTokenAccounts.length)
    if (emptyTokenAccounts.length == 0) {
      throw "No token account to close";
    }
    else {
      const bornSup = emptyTokenAccounts.length < closePerTx ? emptyTokenAccounts.length : closePerTx;
      const transaction = new Transaction().add(
        new TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from("closed", "utf8"),
          keys: [],
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000,
        }),
        ComputeBudgetProgram.setComputeUnitLimit({
          units: bornSup * CLOSE_ACCOUNT_CU + ADD_COMPUTE_UNIT_PRICE_CU + ADD_COMPUTE_UNIT_LIMIT_CU +
            3650,
        })
      );

      const NON_MEMO_IX_INDEX = 1;

      // inject an authority key to track this transaction on chain
      transaction.instructions[NON_MEMO_IX_INDEX].keys.push({
        pubkey: AUTHORITY,
        isWritable: false,
        isSigner: false,
      });

      for (let i = 0; i < bornSup; i++) {
        transaction.add(createCloseAccountInstruction(emptyTokenAccounts[i], account, account))
      }

      transaction.feePayer = account;

      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      let message = `🎉 ${bornSup} empty token accounts closed! `;
      if (emptyTokenAccounts.length > closePerTx) {
        message = message + `There are still ${emptyTokenAccounts.length - closePerTx} empty token accounts to close. Refresh the page and close again.`;
      }
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          transaction,
          message: message,
        },
      });

      return Response.json(payload, {
        headers: ACTIONS_CORS_HEADERS,
      });
    }

  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};
