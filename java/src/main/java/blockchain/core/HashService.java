package blockchain.core;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * SHA-256 + canonical serialization. Must stay byte-for-byte identical to web/blockchain-core.js.
 *
 *   DATA     : number + nonce + data                                  [+ prev if linked]
 *   TOKENS   : number + nonce + SUM(amount+from+to)                   [+ prev]
 *   COINBASE : number + nonce + cbAmount + cbTo + SUM(amount+from+to) [+ prev]
 * Plain concatenation, no separators, UTF-8. canonical = head + nonce + tail.
 */
public final class HashService {
    private HashService() {}

    public static String sha256Hex(String text) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String txString(Block b) {
        StringBuilder sb = new StringBuilder();
        for (Block.Tx t : b.tx) sb.append(t.amount).append(t.from).append(t.to);
        return sb.toString();
    }

    /** {head, tail}: canonical data is head + nonce + tail. */
    public static String[] serializeParts(Block b) {
        String body;
        switch (b.kind) {
            case TOKENS: body = txString(b); break;
            case COINBASE: body = b.coinbaseAmount + b.coinbaseTo + txString(b); break;
            default: body = b.data;
        }
        return new String[] { b.number, body + (b.linked ? b.prev : "") };
    }

    public static String canonicalBlockData(Block b) {
        String[] p = serializeParts(b);
        return p[0] + b.nonce + p[1];
    }

    public static String calculateHash(Block b) {
        return sha256Hex(canonicalBlockData(b));
    }
}
