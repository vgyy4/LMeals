/**
 * Scaling utility for recipe ingredients and servings.
 * Handles parsing quantities (including fractions and mixed numbers) and scaling them.
 */

// Format a number to a clean string (avoiding 0.33333333333)
const formatNumber = (num: number): string => {
    if (Number.isInteger(num)) return num.toString();

    // Try to use common fractions if close enough
    const fractions: [number, string][] = [
        [0.25, '1/4'],
        [0.33, '1/3'],
        [0.5, '1/2'],
        [0.66, '2/3'],
        [0.75, '3/4']
    ];

    const decimal = num % 1;
    const integer = Math.floor(num);

    for (const [val, label] of fractions) {
        if (Math.abs(decimal - val) < 0.05) {
            return integer > 0 ? `${integer} ${label}` : label;
        }
    }

    // Fallback to max 2 decimal places
    return parseFloat(num.toFixed(2)).toString();
};

/**
 * Scales a quantity string by a multiplier.
 * Examples: 
 * "2 cups" -> "4 cups"
 * "1 1/2 tsp" -> "3 tsp"
 * "1/2 onion" -> "1 onion"
 */
export const scaleIngredientText = (text: string, multiplier: number): string => {
    if (multiplier === 1) return text;

    // Regex to find numbers, fractions, or mixed numbers at the start of the string
    // Matches: "2", "2.5", "1/2", "1 1/2", "1-1/2"
    const quantityRegex = /^(\d+\s+\d\/\d|\d+\/\d|\d+\.\d+|\d+)/;
    const match = text.match(quantityRegex);

    if (!match) return text;

    const rawQty = match[0];
    const remaining = text.slice(rawQty.length);

    let numericValue = 0;

    // Case: "1 1/2" or "1-1/2" (Mixed number)
    if (rawQty.includes(' ') || rawQty.includes('-')) {
        const parts = rawQty.split(/[\s-]+/);
        const whole = parseInt(parts[0]);
        const fraction = parts[1].split('/');
        numericValue = whole + (parseInt(fraction[0]) / parseInt(fraction[1]));
    }
    // Case: "1/2" (Fraction only)
    else if (rawQty.includes('/')) {
        const parts = rawQty.split('/');
        numericValue = parseInt(parts[0]) / parseInt(parts[1]);
    }
    // Case: "2" or "2.5" (Simple number)
    else {
        numericValue = parseFloat(rawQty);
    }

    if (isNaN(numericValue)) return text;

    const scaledValue = numericValue * multiplier;
    const formattedValue = formatNumber(scaledValue);

    return `${formattedValue}${remaining}`;
};

/**
 * Extracts the primary number from a servings string and scales it.
 * Example: "4 servings" -> "8 servings"
 */
export const scaleServings = (servings: string, multiplier: number): string => {
    if (!servings || multiplier === 1) return servings;

    const match = servings.match(/(\d+)/);
    if (!match) return servings;

    const originalValue = parseInt(match[0]);
    const scaledValue = Math.round(originalValue * multiplier);

    return servings.replace(match[0], scaledValue.toString());
};

/**
 * Scales an instruction template by replacing [[qty:NUMBER]] with scaled values.
 * Example: "Add [[qty:100]]ml" -> "Add 200ml" (if multiplier is 2)
 */
export const scaleTemplate = (template: string, multiplier: number): string => {
    if (multiplier === 1) {
        // Just strip the tags but keep the original numbers
        return template.replace(/\[\[qty:([\d.]+)\]\]/g, '$1');
    }

    return template.replace(/\[\[qty:([\d.]+)\]\]/g, (_, qtyStr) => {
        const qty = parseFloat(qtyStr);
        if (isNaN(qty)) return qtyStr;
        return formatNumber(qty * multiplier);
    });
};
