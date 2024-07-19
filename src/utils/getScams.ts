import { PublicKey, Connection } from "@solana/web3.js";
import { SCAM_TOKEN_LIST } from "./scamToken";

export async function getScams(owner: PublicKey, connection: Connection, program: PublicKey) {

    const scams: {
        mint: PublicKey;
        account: PublicKey;
        amount: number;
      }[] = [];
    const accounts = (await connection.getTokenAccountsByOwner(owner, { programId: program })).value;

    accounts.map((account) => {
            const mintBuffer = account.account.data.slice(0, 32);
            const mint = new PublicKey(mintBuffer).toBase58();
            const amount = account.account.data.readBigInt64LE(64);
            if (SCAM_TOKEN_LIST.includes(mint) && amount != BigInt(0)) {
                scams.push({
                    mint: new PublicKey(mint),
                    account: account.pubkey,
                    amount: Number(amount),
                });
            }
    })

    return scams;
}