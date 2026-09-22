package blockchain.core;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** THE validator. Mirrors validateBlock / validateBlockchain in web/blockchain-core.js. */
public final class ValidationService {
    public static final int DIFFICULTY = 4;
    public static final String REQUIRED_PREFIX = "0".repeat(DIFFICULTY);

    private static final Pattern INT = Pattern.compile("^-?\\d+$");
    private static final Pattern NONNEG_INT = Pattern.compile("^\\d+$");

    private ValidationService() {}

    /*
     * The reference demo places no format restriction on amounts: Tokens block 5
     * uses "2,760.29" (a thousands separator) and hashes fine. Only number/nonce
     * are structurally constrained; amount/from/to are free text, exactly what's hashed.
     */
    private static String structureError(Block b) {
        if (!INT.matcher(b.number).matches()) return "Invalid block number";
        if (!NONNEG_INT.matcher(b.nonce).matches()) return "Invalid nonce";
        if (b.kind == Block.Kind.COINBASE
                && (b.coinbaseAmount.isEmpty() || b.coinbaseTo.isEmpty())) return "Invalid transaction data";
        if (b.kind != Block.Kind.DATA) {
            for (Block.Tx t : b.tx) {
                if (t.amount.isEmpty() || t.from.isEmpty() || t.to.isEmpty()) return "Invalid transaction data";
            }
        }
        return null;
    }

    /** Local validity of ONE block. previousBlock == null means genesis position. */
    public static BlockValidationResult validateBlock(Block block, Block previousBlock) {
        BlockValidationResult r = new BlockValidationResult();
        r.calculatedHash = HashService.calculateHash(block);
        r.hashCorrect = block.hash.equals(r.calculatedHash);                        // A
        r.proofOfWorkValid = r.calculatedHash.startsWith(REQUIRED_PREFIX);          // B
        r.previousHashValid = true;
        String prevReason = null;
        if (block.linked) {                                                         // C / D
            r.actualPreviousHash = block.prev;
            if (previousBlock != null) {
                r.expectedPreviousHash = HashService.calculateHash(previousBlock);
                prevReason = "Previous hash mismatch";
            } else {
                r.expectedPreviousHash = Block.GENESIS_PREV;
                prevReason = "Genesis previous hash mismatch";
            }
            r.previousHashValid = r.actualPreviousHash.equals(r.expectedPreviousHash);
        }
        String sErr = structureError(block);
        r.structureValid = sErr == null;
        if (sErr != null) r.reason = sErr;
        else if (!r.hashCorrect) r.reason = "Hash mismatch";
        else if (!r.proofOfWorkValid) r.reason = "Proof of work not satisfied";
        else if (!r.previousHashValid) r.reason = prevReason;
        r.valid = r.reason == null;
        r.locallyValid = r.valid;
        return r;
    }

    /** A block is valid only if it is locally valid AND the block before it is valid. */
    public static BlockchainValidationResult validateBlockchain(List<Block> blocks) {
        List<BlockValidationResult> results = new ArrayList<>();
        boolean all = true;
        for (int i = 0; i < blocks.size(); i++) {
            BlockValidationResult r = validateBlock(blocks.get(i), i > 0 ? blocks.get(i - 1) : null);
            r.previousBlockValid = i == 0 || results.get(i - 1).valid;
            if (r.locallyValid) r.reason = r.previousBlockValid ? null : "Previous block invalid";
            r.valid = r.locallyValid && r.previousBlockValid;
            all &= r.valid;
            results.add(r);
        }
        return new BlockchainValidationResult(all, results);
    }
}
