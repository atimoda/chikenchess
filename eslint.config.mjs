import js from "@eslint/js"
import tsParser from "@typescript-eslint/parser"
import tsPlugin from "@typescript-eslint/eslint-plugin"

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "public/stockfish.js",
      "scripts/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        React: "readonly",
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        AudioContext: "readonly",
        AudioBuffer: "readonly",
        AudioScheduledSourceNode: "readonly",
        AnalyserNode: "readonly",
        OscillatorNode: "readonly",
        GainNode: "readonly",
        StereoPannerNode: "readonly",
        BiquadFilterNode: "readonly",
        OscillatorType: "readonly",
        AudioNode: "readonly",
        HTMLDivElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLElement: "readonly",
        Element: "readonly",
        Node: "readonly",
        Worker: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        MouseEvent: "readonly",
        TouchEvent: "readonly",
        NodeJS: "readonly",
        confirm: "readonly",
        navigator: "readonly",
        alert: "readonly",
        KeyboardEvent: "readonly",
        HTMLCanvasElement: "readonly",
        SVGSVGElement: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]
