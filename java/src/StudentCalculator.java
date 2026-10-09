import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class StudentCalculator {
    private static BigDecimal readNumber(String json, String key) {
        Pattern pattern = Pattern.compile("\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)");
        Matcher matcher = pattern.matcher(json);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Missing numeric field: " + key);
        }
        String value = matcher.group(1);
        if (matcher.find()) {
            throw new IllegalArgumentException("Duplicate field: " + key);
        }
        return new BigDecimal(value);
    }

    public static void main(String[] args) throws Exception {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            String input = reader.readLine();
            if (input == null || input.isBlank()) {
                throw new IllegalArgumentException("Expected a JSON object on stdin");
            }

            int maths = readNumber(input, "maths").intValueExact();
            int java = readNumber(input, "java").intValueExact();
            int dbms = readNumber(input, "dbms").intValueExact();
            BigDecimal attendance = readNumber(input, "attendance");
            if (maths < 0 || maths > 100 || java < 0 || java > 100 || dbms < 0 || dbms > 100
                    || attendance.compareTo(BigDecimal.ZERO) < 0 || attendance.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new IllegalArgumentException("Marks and attendance must be between 0 and 100");
            }

            int total = maths + java + dbms;
            BigDecimal percentage = BigDecimal.valueOf(total).divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
            String grade = percentage.compareTo(BigDecimal.valueOf(90)) >= 0 ? "A"
                    : percentage.compareTo(BigDecimal.valueOf(80)) >= 0 ? "B"
                    : percentage.compareTo(BigDecimal.valueOf(70)) >= 0 ? "C"
                    : percentage.compareTo(BigDecimal.valueOf(60)) >= 0 ? "D" : "F";
            boolean passed = maths >= 40 && java >= 40 && dbms >= 40 && percentage.compareTo(BigDecimal.valueOf(40)) >= 0;
            String result = passed ? "PASS" : "FAIL";
            String attendanceStatus = attendance.compareTo(BigDecimal.valueOf(75)) >= 0 ? "OK" : "WARNING";

            System.out.printf("{\"total\":%d,\"percentage\":%s,\"grade\":\"%s\",\"result\":\"%s\",\"attendance_status\":\"%s\"}%n",
                    total, percentage.toPlainString(), grade, result, attendanceStatus);
        } catch (RuntimeException error) {
            System.err.println(error.getMessage());
            System.exit(1);
        }
    }
}