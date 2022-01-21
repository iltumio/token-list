import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import BufferLayout from 'buffer-layout';

const tokenMetaLayout = BufferLayout.struct([
  BufferLayout.seq(BufferLayout.u8(), 32, 'mintAccount'),
  BufferLayout.u8('approved'),
  BufferLayout.seq(BufferLayout.u8(), 32, 'info1'),
  BufferLayout.seq(BufferLayout.u8(), 32, 'info2'),
]);

interface TokenMetaAccountData {
  mintAccount: string;
  approved: boolean;
  cid: string;
}

const NETWORK = 'https://api.devnet.solana.com';
const PROGRAM_ID = 'J7EQ8XVBcaKb1E4GgwnXiMnfGmuS97PiWXb4G4qoLNZw';
const IPFS_GATEWAY = 'https://cloudflare-ipfs.com/ipfs';

export class ROADListProvider {
  connection: Connection;
  registryProgramID: PublicKey;
  ipfsGateway: string;

  constructor() {
    this.connection = new Connection(NETWORK);
    this.registryProgramID = new PublicKey(PROGRAM_ID);
    this.ipfsGateway = IPFS_GATEWAY;
  }

  formatTokenData(result: {
    pubkey: PublicKey;
    account: AccountInfo<Buffer>;
  }): TokenMetaAccountData {
    const data = result.account.data;
    const info = tokenMetaLayout.decode(Buffer.from(data));
    const rawCid1 = info.info1.slice(18);
    const rawCid2 = info.info2;

    const cid =
      Buffer.from(rawCid1).toString() + Buffer.from(rawCid2).toString();

    return {
      cid,
      approved: Boolean(info.approved),
      mintAccount: info.mintAccount as string,
    };
  }

  async getTokenList() {
    const result = await this.connection.getProgramAccounts(
      this.registryProgramID,
      {
        commitment: 'confirmed',
        filters: [{ dataSize: 97 }],
      }
    );

    return result.map((tokenData) => this.formatTokenData(tokenData));
  }

  async getTokenLinks() {
    const list = await this.getTokenList();

    return list.map((metaData) => `${this.ipfsGateway}/${metaData.cid}`);
  }
}
