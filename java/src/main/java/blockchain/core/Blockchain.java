package blockchain.core;

import java.util.ArrayList;
import java.util.List;

/** Mutable chain state (one peer). Same edit / mine / relink rules as Chain in blockchain-core.js. */
public class Blockchain {
    public final List<Block> blocks = new ArrayList<>();

    public BlockchainValidationResult validate() { return ValidationService.validateBlockchain(blocks); }

    /** Paths: number, nonce, data, prev, coinbase.amount, coinbase.to, tx.N.amount|from|to */
    public void setField(int index, String path, String value) {
        Block b = blocks.get(index);
        String[] p = path.split("\\.");
        if (p.length == 1) {
            switch (p[0]) {
                case "number": b.number = value; break;
                case "nonce": b.nonce = value; break;
                case "data": b.data = value; break;
                case "prev": b.prev = value; break;
                default: throw new IllegalArgumentException(path);
            }
        } else if (p[0].equals("coinbase")) {
            if (p[1].equals("amount")) b.coinbaseAmount = value; else b.coinbaseTo = value;
        } else if (p[0].equals("tx")) {
            Block.Tx t = b.tx.get(Integer.parseInt(p[1]));
            switch (p[2]) {
                case "amount": t.amount = value; break;
                case "from": t.from = value; break;
                default: t.to = value;
            }
        } else throw new IllegalArgumentException(path);
        b.hash = HashService.calculateHash(b);   // derived, never trusted
    }

    /** Store the mined nonce; the NEXT block's Prev follows the new hash (and so becomes invalid until mined). */
    public void mine(int index) {
        Block b = blocks.get(index);
        b.nonce = Long.toString(MiningService.findNonce(b).nonce);
        b.hash = HashService.calculateHash(b);
        if (index + 1 < blocks.size() && blocks.get(index + 1).linked) {
            Block next = blocks.get(index + 1);
            next.prev = b.hash;
            next.hash = HashService.calculateHash(next);
        }
    }

    /** Link + mine every block in order (used to build a valid starting chain). */
    public void mineAll() {
        for (int i = 0; i < blocks.size(); i++) {
            Block b = blocks.get(i);
            if (b.linked) b.prev = i == 0 ? Block.GENESIS_PREV : blocks.get(i - 1).hash;
            b.hash = HashService.calculateHash(b);
            mine(i);
        }
    }
}
