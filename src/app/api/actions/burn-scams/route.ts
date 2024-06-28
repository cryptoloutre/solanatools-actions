import { ACTIONS_CORS_HEADERS, ActionGetResponse, ActionPostRequest, ActionPostResponse, createPostResponse } from "@solana/actions";
import { ComputeBudgetProgram, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { createBurnInstruction, createCloseAccountInstruction } from "@solana/spl-token";
import { SCAM_TOKEN_LIST } from "@/utils/scamToken";


export const GET = async (req: Request) => {
  const payload: ActionGetResponse = {
    title: "Burn scam tokens",
    icon: new URL("/solanatools.jpg", new URL(req.url).origin).toString(),
    description: "Burn scam tokens & get SOL back",
    label: "Burn Scams",
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
    const burnPerTx = 10;

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
    const scamTokens: { mint: PublicKey, account: PublicKey, amount: number }[] = [];

    tokenAccounts.map((tokenAccount: any) => {
      const mint = tokenAccount.account?.data?.parsed?.info?.mint;
      const amount = tokenAccount.account?.data?.parsed?.info?.tokenAmount.amount;
      if (SCAM_TOKEN_LIST.includes(mint) && amount != 0) {
        const account = tokenAccount.pubkey;
        //@ts-ignore
        scamTokens.push({
          mint: new PublicKey(mint),
          account: account,
          amount: amount
        })
      }
    })

    console.log(scamTokens.length)
    console.log(scamTokens)
    if (scamTokens.length == 0) {
      const message = "No scam token to burn";
      return new Response(message, {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }
    else {
      const bornSup = scamTokens.length < burnPerTx ? scamTokens.length : burnPerTx;
      const transaction = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000,
        }),
        // ComputeBudgetProgram.setComputeUnitLimit({
        //   units: bornSup * 3000 + 300,
        // })
      );

      for (let i = 0; i < bornSup; i++) {
        transaction.add(createBurnInstruction(scamTokens[i].account, scamTokens[i].mint, account, scamTokens[i].amount))
        transaction.add(createCloseAccountInstruction(scamTokens[i].account, account, account))
      }

      transaction.feePayer = account;

      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          transaction,
          message: "Scam tokens burned!",
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
