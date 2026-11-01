import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "docs/**", "next-env.d.ts", "scripts/**", "prisma/seed.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Dead code: unused things are errors, `_name` opts out.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      // Correctness and consistency.
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-var": "error",
      "no-duplicate-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports", fixStyle: "inline-type-imports" }],
      // Money must go through amountPaise (src/lib/domain/money.ts); a float `/ 1000` rounding is a bug.
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='round'] > BinaryExpression[operator='/'][right.value=1000][left.type='BinaryExpression'][left.operator='*']",
          message: "Use amountPaise(grams, ratePerKgPaise) from @/lib/domain/money instead of Math.round(x / 1000).",
        },
      ],
    },
  },
  {
    // Tests may be looser.
    files: ["tests/**/*.ts"],
    rules: { "no-console": "off", "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/consistent-type-imports": "off" },
  },
];

export default config;
