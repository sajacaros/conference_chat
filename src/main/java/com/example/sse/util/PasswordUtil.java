package com.example.sse.util;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class PasswordUtil {

    public static String generatePassword(String ticker) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd "));
        return dateStr.replace(" ", ticker) + "!";
    }
}
