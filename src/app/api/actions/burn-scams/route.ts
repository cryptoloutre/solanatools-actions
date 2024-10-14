import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  MEMO_PROGRAM_ID,
  createActionHeaders,
  createPostResponse,
} from "@solana/actions";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createBurnInstruction,
  createCloseAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ADD_COMPUTE_UNIT_LIMIT_CU,
  ADD_COMPUTE_UNIT_PRICE_CU,
  BURN_CU,
  CLOSE_ACCOUNT_CU,
} from "@/utils/CUperInstructions";
import { AUTHORITY, RPC_URL } from "@/utils/config";
import { getScams } from "@/utils/getScams";

// create the standard headers for this route (including CORS)
const headers = createActionHeaders();

export const GET = async (req: Request) => {
  const payload: ActionGetResponse = {
    title: "Burn scam tokens",
    icon: new URL("/solanatools.jpg", new URL(req.url).origin).toString(),
    description:
      "Burn scam tokens & get SOL back. You will burn 10 scam tokens at a time and earn ~0.002 SOL per token.",
    label: "Burn Scams",
  };

  return Response.json(payload, {
    headers,
  });
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers,
      });
    }

    const connection = new Connection(RPC_URL);
    const burnPerTx = 10;

    const regularScams = await getScams(account, connection, TOKEN_PROGRAM_ID);
    const token2022Scams = await getScams(
      account,
      connection,
      TOKEN_2022_PROGRAM_ID,
    );

    const scamTokens = regularScams.concat(token2022Scams);

    console.log("Number of accounts to burn: ", scamTokens.length);

    if (scamTokens.length == 0) {
      throw "No scam token to burn";
    } else {
      const bornSup =
        scamTokens.length < burnPerTx ? scamTokens.length : burnPerTx;
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

      for (let i = 0; i < bornSup; i++) {
        transaction.add(
          createBurnInstruction(
            scamTokens[i].account,
            scamTokens[i].mint,
            account,
            scamTokens[i].amount,
            [],
            scamTokens[i].program
          ),
        );
        transaction.add(
          createCloseAccountInstruction(
            scamTokens[i].account,
            account,
            account,
            [],
            scamTokens[i].program
          ),
        );
      }

      transaction.feePayer = account;

      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      let message = `🎉 ${bornSup} scam tokens burned! `;
      if (scamTokens.length > burnPerTx) {
        message =
          message +
          `There are still ${
            scamTokens.length - burnPerTx
          } scam tokens to burn. Refresh the page and burn again.`;
      }
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          transaction,
          message: message,
          type: "transaction",
        },
      });

      return Response.json(payload, {
        headers,
      });
    }
  } catch (err) {
    console.log(err);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return Response.json(actionError, {
      status: 400,
      headers,
    });
  }
};
