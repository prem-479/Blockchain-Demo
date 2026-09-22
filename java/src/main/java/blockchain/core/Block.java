package blockchain.core;

import java.util.ArrayList;
import java.util.List;

/** One block. Every field is a String exactly as typed (amounts are never re-formatted). */
public class Block {
    public enum Kind { DATA, TOKENS, COINBASE }

    public static class Tx {
        public String amount, from, to;
        public Tx(String amount, String from, String to) { this.amount = amount; this.from = from; this.to = to; }
    }

    public static final String GENESIS_PREV = "0".repeat(64);

    public Kind kind;
    /** false only for the standalone Block page (no Prev field, no linkage rules). */
    public boolean linked = true;
    public String number = "1";
    public String nonce = "0";
    public String data = "";
    public String prev = GENESIS_PREV;
    /** The DISPLAYED hash. Never trusted: ValidationService recalculates it. */
    public String hash = "";
    public String coinbaseAmount = "0.00";
    public String coinbaseTo = "";
    public List<Tx> tx = new ArrayList<>();

    public Block(Kind kind) { this.kind = kind; }

    public Block(Kind kind, String number) { this(kind); this.number = number; }
}
