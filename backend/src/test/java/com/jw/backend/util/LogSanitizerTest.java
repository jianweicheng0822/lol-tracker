package com.jw.backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LogSanitizerTest {

    @Test
    void replacesLineBreaksSoAValueCantStartANewLogEntry() {
        assertEquals("abc_ INFO forged", LogSanitizer.clean("abc\n INFO forged"));
        assertEquals("a__b", LogSanitizer.clean("a\r\nb"));
    }

    @Test
    void leavesOrdinaryValuesAlone() {
        assertEquals("challenger:RANKED_SOLO_5x5:NA:0:25", LogSanitizer.clean("challenger:RANKED_SOLO_5x5:NA:0:25"));
        assertEquals("null", LogSanitizer.clean(null));
    }
}
