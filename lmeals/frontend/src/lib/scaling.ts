/**
 * Scaling utility for recipe ingredients and servings.
 * Handles parsing quantities (including fractions and mixed numbers) and scaling them.
 */

// Format a number to a clean string (avoiding 0.33333333333)
// Format a number to a clean string (avoiding 0.33333333333)
const formatNumber = (num: number): string => {
    if (Number.isInteger(num)) return num.toString();

    // User preference: ALWAYS use decimals (e.g. 1.5), never fractions (e.g. 1 1/2)
    // Fallback to max 2 decimal places, but remove trailing zeros
    return parseFloat(num.toFixed(2)).toString();
};

/**
 * Scales an ingredient string by a multiplier.
 * Handles multiple quantities in a single line (e.g. volume and weight).
 */
export const scaleIngredientText = (text: string, multiplier: number): string => {
    // Priority 1: Handle tagged quantities [[qty:NUMBER]] or [[qty:MIN-MAX]]
    // If the string contains tags, we ONLY scale the tags to avoid double-scaling
    if (text.includes('[[qty:')) {
        return text.replace(/\[\[qty:([0-9.\-]+)\]\]/g, (_, qtyStr) => {
            if (qtyStr.includes('-')) {
                const [min, max] = qtyStr.split('-').map(parseFloat);
                if (!isNaN(min) && !isNaN(max)) {
                    return `${formatNumber(min * multiplier)}-${formatNumber(max * multiplier)}`;
                }
            }
            const qty = parseFloat(qtyStr);
            return isNaN(qty) ? qtyStr : formatNumber(qty * multiplier);
        });
    }

    // Priority 2: Use regex to find all raw numbers, fractions, and mixed numbers
    // This handles "4 1/4 cups (281 g)" -> "8 1/2 cups (562 g)"
    const rawQuantityRegex = /(\d+\s+\d\/\d|\d+\/\d|\d+\.\d+|\d+)/g;

    return text.replace(rawQuantityRegex, (match) => {
        let numericValue = 0;

        // Mixed number: "1 1/2" or "1-1/2"
        if (match.includes(' ') || (match.includes('-') && match.includes('/'))) {
            const parts = match.split(/[\s-]+/);
            const whole = parseInt(parts[0]);
            const fraction = parts[1].split('/');
            numericValue = whole + (parseInt(fraction[0]) / parseInt(fraction[1]));
        }
        // Fraction: "1/2"
        else if (match.includes('/')) {
            const parts = match.split('/');
            numericValue = parseInt(parts[0]) / parseInt(parts[1]);
        }
        // Decimal or Whole: "2" or "2.5"
        else {
            numericValue = parseFloat(match);
        }

        if (isNaN(numericValue)) return match;
        return formatNumber(numericValue * multiplier);
    });
};

/**
 * Extracts the primary number from a servings string and scales it.
 * Example: "4 servings" -> "8 servings"
 * Note: Servings are usually integers, but we handle rounding.
 */
export const scaleServings = (servings: string, multiplier: number): string => {
    if (!servings || multiplier === 1) return servings;

    // Check for range first: "20-24"
    const rangeMatch = servings.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
        const min = Math.round(parseInt(rangeMatch[1]) * multiplier);
        const max = Math.round(parseInt(rangeMatch[2]) * multiplier);
        return servings.replace(rangeMatch[0], `${min}-${max}`);
    }

    const match = servings.match(/(\d+)/);
    if (!match) return servings;

    const originalValue = parseInt(match[0]);
    const scaledValue = Math.round(originalValue * multiplier);

    return servings.replace(match[0], scaledValue.toString());
};

/**
 * Robustly formats a servings string with a unit, avoiding duplicates.
 * Handles cases where unit is already in the string or provided separately.
 */
export const formatServings = (servings: string, multiplier: number, yieldUnit?: string): string => {
    const scaled = scaleServings(servings, multiplier);
    const unit = yieldUnit || 'servings';
    const sLower = scaled.toLowerCase();
    const uLower = unit.toLowerCase();

    // Logic to avoid double units
    if (sLower.includes(uLower) ||
        (uLower === 'servings' && sLower.includes('serving')) ||
        (uLower === 'servings' && sLower.includes('yield'))) {
        return scaled;
    }
    return `${scaled} ${unit}`;
};

/**
 * Scales an instruction template by replacing [[qty:NUMBER]] with scaled values.
 * Example: "Add [[qty:100]]ml" -> "Add 200ml" (if multiplier is 2)
 */
export const scaleTemplate = (template: string, multiplier: number): string => {
    return template.replace(/\[\[qty:([\d.]+)\]\]/g, (_, qtyStr) => {
        const qty = parseFloat(qtyStr);
        if (isNaN(qty)) return qtyStr;
        return formatNumber(qty * multiplier);
    });
};
