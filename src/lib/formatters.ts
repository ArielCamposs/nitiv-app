export function formatPhone(value: string): string {
    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("569")) {
        digits = digits.slice(3);
    } else if (digits.startsWith("56")) {
        digits = digits.slice(2);
    }

    digits = digits.slice(0, 8);

    if (digits.length === 0) return "+56 9 ";

    if (digits.length <= 4) return `+56 9 ${digits}`;
    return `+56 9 ${digits.slice(0, 4)} ${digits.slice(4)}`;
}

export function formatRut(value: string): string {
    // Remove everything but numbers and K/k
    let clean = value.replace(/[^0-9kK]/g, "").toUpperCase();
    if (!clean) return "";

    // If more than 9 chars, truncate
    clean = clean.slice(0, 9);

    const checkDigit = clean.slice(-1);
    const body = clean.slice(0, -1);

    if (clean.length === 1) return clean;

    // Add dots to body
    let formattedBody = "";
    for (let i = body.length - 1, j = 1; i >= 0; i--, j++) {
        formattedBody = body.charAt(i) + formattedBody;
        if (j % 3 === 0 && i !== 0) {
            formattedBody = "." + formattedBody;
        }
    }

    return `${formattedBody}-${checkDigit}`;
}
