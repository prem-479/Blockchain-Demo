package blockchain.core;

public class BlockValidationResult {
    /** For validateBlock(): local validity. For validateBlockchain(): local validity AND previous block valid. */
    public boolean valid;
    public boolean hashCorrect;
    public boolean proofOfWorkValid;
    public boolean previousHashValid;
    public boolean structureValid;
    public boolean locallyValid;
    public boolean previousBlockValid = true;
    public String calculatedHash;
    public String expectedPreviousHash;
    public String actualPreviousHash;
    /** null when valid. */
    public String reason;
}
