import { ACTIONS_CORS_HEADERS, ActionGetResponse, ActionPostRequest, ActionPostResponse, createPostResponse } from "@solana/actions";
import { ComputeBudgetProgram, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { createCloseAccountInstruction } from "@solana/spl-token";
import { ADD_COMPUTE_UNIT_LIMIT_CU, ADD_COMPUTE_UNIT_PRICE_CU, CLOSE_ACCOUNT_CU } from "@/utils/CUperInstructions";


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

    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=194196fa-41b1-48f1-82dc-9b4d6ba2bb6c");
    const closePerTx = 20;

    const tokenAccounts = await connection.getParsedProgramAccounts(
      new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      {
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
      }
    );

    const emptyTokenAccounts = tokenAccounts.filter((m: any) => {
      //@ts-ignore
      const amount = m.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
      return amount == 0;
    })

    console.log(emptyTokenAccounts.length)
    if (emptyTokenAccounts.length == 0) {
      const message = "No token account to close";
      return new Response(JSON.parse(message), {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }
    else {
      const bornSup = emptyTokenAccounts.length < closePerTx ? emptyTokenAccounts.length : closePerTx;
      const transaction = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000,
        }),
        ComputeBudgetProgram.setComputeUnitLimit({
          units: bornSup * CLOSE_ACCOUNT_CU + ADD_COMPUTE_UNIT_PRICE_CU + ADD_COMPUTE_UNIT_LIMIT_CU,
        })
      );

      for (let i = 0; i < bornSup; i++) {
        transaction.add(createCloseAccountInstruction(emptyTokenAccounts[i].pubkey, account, account))
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
    if (typeof err == "string") message = JSON.parse(err);
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};
