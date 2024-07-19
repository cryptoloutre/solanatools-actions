import { PublicKey, Connection } from "@solana/web3.js";

export async function getEmptyTokenAccounts(owner: PublicKey, connection: Connection, program: PublicKey) {

    const emptyTokenAccounts: PublicKey[] = [];
    const accounts = (await connection.getTokenAccountsByOwner(owner, { programId: program })).value;

    accounts.map((account) => {
        if (account.account.data.readBigInt64LE(64) == BigInt(0)) {
            emptyTokenAccounts.push(account.pubkey);
        }
    })

    return emptyTokenAccounts;
}