package com.testhub.utils;

/**
 * XPath string-literal helpers. Dynamic locators are built from runtime data
 * (project names, test-case titles, …) which may contain quotes — naive
 * concatenation would produce an invalid XPath expression. {@link #quote}
 * always yields a valid literal, falling back to {@code concat()} when the
 * value mixes both quote characters.
 */
public final class XPathUtil {

    private XPathUtil() {
    }

    /** Returns {@code value} as a safely quoted XPath string literal. */
    public static String quote(String value) {
        if (value == null) {
            return "''";
        }
        if (!value.contains("'")) {
            return "'" + value + "'";
        }
        if (!value.contains("\"")) {
            return "\"" + value + "\"";
        }
        // Contains both quote types: stitch pieces together with concat().
        // e.g.  a'b"c  →  concat('a', "'", 'b"c')
        StringBuilder sb = new StringBuilder("concat(");
        String remaining = value;
        boolean first = true;
        while (!remaining.isEmpty()) {
            int apos = remaining.indexOf('\'');
            String chunk;
            if (apos == -1) {
                chunk = "'" + remaining + "'";
                remaining = "";
            } else if (apos == 0) {
                chunk = "\"'\"";
                remaining = remaining.substring(1);
            } else {
                chunk = "'" + remaining.substring(0, apos) + "'";
                remaining = remaining.substring(apos);
            }
            if (!first) {
                sb.append(", ");
            }
            sb.append(chunk);
            first = false;
        }
        return sb.append(')').toString();
    }
}
