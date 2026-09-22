package blockchain.core;

/** Real proof of work: first nonce counting up from 0 whose hash starts with the required prefix. */
public final class MiningService {
    private MiningService() {}

    public static final class Result {
        public final long nonce;
        public final String hash;
        Result(long nonce, String hash) { this.nonce = nonce; this.hash = hash; }
    }

    public static Result findNonce(Block block) {
        String[] p = HashService.serializeParts(block);
        for (long n = 0; ; n++) {
            String h = HashService.sha256Hex(p[0] + n + p[1]);
            if (h.startsWith(ValidationService.REQUIRED_PREFIX)) return new Result(n, h);
        }
    }
}
