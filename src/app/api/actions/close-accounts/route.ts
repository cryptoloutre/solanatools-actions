import { ACTIONS_CORS_HEADERS, ActionGetResponse, ActionPostRequest, ActionPostResponse, createPostResponse } from "@solana/actions";
import { ComputeBudgetProgram, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { createCloseAccountInstruction } from "@solana/spl-token";


export const GET = async (req: Request) => {
  const payload: ActionGetResponse = {
    title: "Close your empty token accounts",
    icon: new URL("/solanatools.jpg", new URL(req.url).origin).toString(),
    description: "Close your empty token accounts & get SOL back",
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

    const tokenAccounts = await connection.getParsedProgramAccounts(
      new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      {
        filters: [
          {
            dataSize: 165, // number of bytes
          },
          {
            memcmp: {
              offset: 32, // number of bytes
              bytes: account.toBase58(), // base58 encoded string
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

    const transaction = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000,
      })
    );

    const bornSup = emptyTokenAccounts.length < 10 ? emptyTokenAccounts.length : 10;

    for (let i = 0; i < bornSup; i++) {
const closeIx = await createCloseAccountInstruction(emptyTokenAccounts[i].pubkey, account, account);

      transaction.add(createCloseAccountInstruction(emptyTokenAccounts[i].pubkey, account, account))
    }

    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: "Close your empty token accounts",
      },
    });

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
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
