package blockchain.core;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Proves the Java HashService/ValidationService match the frontend (shared vectors) and that the
 * acceptance tests of docs/BLOCKCHAIN_BEHAVIOR.md hold. Plain main() so it needs no test library;
 * every check is a trivial JUnit @Test candidate.
 *
 * Run:  java -cp out blockchain.core.ParityTest shared-test-vectors/vectors.tsv
 */
public class ParityTest {
    static int passed = 0;

    static void check(boolean cond, String name) {
        if (!cond) { System.out.println("FAIL  " + name); System.exit(1); }
        passed++;
        System.out.println("  ok  " + name);
    }

    static String colours(Blockchain c) {
        StringBuilder sb = new StringBuilder();
        for (BlockValidationResult r : c.validate().blocks) sb.append(r.valid ? 'G' : 'R');
        return sb.toString();
    }

    static Blockchain dataChain(int n) {
        Blockchain c = new Blockchain();
        for (int i = 1; i <= n; i++) c.blocks.add(new Block(Block.Kind.DATA, Integer.toString(i)));
        c.mineAll();
        return c;
    }

    static Blockchain tokenChain() {
        Blockchain c = new Blockchain();
        for (int i = 1; i <= 3; i++) {
            Block b = new Block(Block.Kind.TOKENS, Integer.toString(i));
            b.tx.add(new Block.Tx("25.00", "Darcy", "Bingley"));
            b.tx.add(new Block.Tx("4.27", "Elizabeth", "Jane"));
            c.blocks.add(b);
        }
        c.mineAll();
        return c;
    }

    static Blockchain coinbaseChain() {
        Blockchain c = new Blockchain();
        for (int i = 1; i <= 3; i++) {
            Block b = new Block(Block.Kind.COINBASE, Integer.toString(i));
            b.coinbaseAmount = "100.00";
            b.coinbaseTo = "Anders";
            if (i > 1) b.tx.add(new Block.Tx("10.00", "Anders", "Sophia"));
            c.blocks.add(b);
        }
        c.mineAll();
        return c;
    }

    public static void main(String[] args) throws Exception {
        Path vectors = Path.of(args.length > 0 ? args[0] : "shared-test-vectors/vectors.tsv");
        System.out.println("Parity vectors (shared with JS)");
        List<String> lines = Files.readAllLines(vectors, StandardCharsets.UTF_8);
        for (String line : lines) {
            if (line.isEmpty() || line.startsWith("#")) continue;
            String[] f = line.split("\t", -1);
            String name = f[0], kind = f[1], expected = f[10];
            if (kind.equals("raw")) {
                check(HashService.sha256Hex(f[5]).equals(expected), "vector " + name);
                continue;
            }
            Block b = new Block(Block.Kind.valueOf(kind.toUpperCase()));
            b.linked = f[2].equals("true");
            b.number = f[3]; b.nonce = f[4]; b.data = f[5];
            b.coinbaseAmount = f[6]; b.coinbaseTo = f[7];
            if (!f[8].isEmpty()) for (String t : f[8].split(";")) {
                String[] p = t.split(",");
                b.tx.add(new Block.Tx(p[0], p[1], p[2]));
            }
            b.prev = f[9];
            check(HashService.calculateHash(b).equals(expected), "vector " + name);
        }

        System.out.println("Reference-demo behaviour");
        Block first = new Block(Block.Kind.DATA, "1");
        first.linked = false;
        check(MiningService.findNonce(first).nonce == 72608, "mining starts at 0: block 1 / empty data -> nonce 72608");

        System.out.println("Acceptance tests");
        Blockchain c = dataChain(5);
        check(colours(c).equals("GGGGG"), "mined chain is GREEN");
        c.setField(0, "data", "changed");
        check(colours(c).equals("RRRRR"), "TEST 2  edit Block 1 -> all RED");
        c.mine(0);
        check(colours(c).equals("GRRRR"), "TEST 3  mine Block 1 -> GREEN, rest RED");
        c.mine(1);
        check(colours(c).equals("GGRRR"), "TEST 4  mine Block 2 -> GREEN, downstream RED");
        for (int i = 2; i < 5; i++) c.mine(i);
        check(colours(c).equals("GGGGG"), "mining downstream one by one restores GREEN");

        Blockchain single = new Blockchain();
        Block sb = new Block(Block.Kind.DATA, "1"); sb.linked = false;
        single.blocks.add(sb); single.mineAll();
        check(colours(single).equals("G"), "TEST 1  Block page GREEN");
        single.setField(0, "data", "Hello");
        check(colours(single).equals("R"), "TEST 1  edit data -> RED");
        single.mine(0);
        check(colours(single).equals("G"), "TEST 1  Mine -> GREEN");

        Blockchain t = tokenChain();
        t.setField(1, "tx.0.amount", "25.01");
        check(colours(t).equals("GRR"), "TEST 5  tokens: edit tx in Block 2 -> 2..3 RED");
        Blockchain cb = coinbaseChain();
        cb.setField(1, "coinbase.to", "Mallory");
        check(colours(cb).equals("GRR"), "TEST 6  coinbase: edit recipient in Block 2 -> 2..3 RED");

        Blockchain a = dataChain(3), b = dataChain(3);
        a.setField(1, "data", "only A");
        check(colours(a).equals("GRR") && colours(b).equals("GGG"), "TEST 7  peers are independent");

        Blockchain n = dataChain(3);
        n.setField(0, "nonce", Long.toString(Long.parseLong(n.blocks.get(0).nonce) + 1));
        check(colours(n).equals("RRR"), "TEST 8  manual nonce change -> RED");

        Blockchain p = dataChain(3);
        p.setField(1, "prev", "deadbeef");
        p.mine(1);
        BlockValidationResult r = p.validate().blocks.get(1);
        check(r.proofOfWorkValid && r.hashCorrect && !r.previousHashValid && !r.valid
                && "Previous hash mismatch".equals(r.reason), "TEST 9  wrong Prev is RED even with four zeroes");

        Blockchain g = dataChain(2);
        g.setField(0, "prev", "1" + "0".repeat(63));
        g.mine(0);
        check("Genesis previous hash mismatch".equals(g.validate().blocks.get(0).reason), "condition D: genesis prev");

        Blockchain h = dataChain(2);
        h.blocks.get(0).hash = "f".repeat(64);
        check("Hash mismatch".equals(h.validate().blocks.get(0).reason), "condition A: displayed hash not trusted");

        System.out.println("\n" + passed + " tests passed");
    }
}
