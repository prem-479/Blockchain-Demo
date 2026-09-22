package blockchain.core;

import java.util.List;

public class BlockchainValidationResult {
    public final boolean valid;
    public final List<BlockValidationResult> blocks;

    public BlockchainValidationResult(boolean valid, List<BlockValidationResult> blocks) {
        this.valid = valid;
        this.blocks = blocks;
    }
}
