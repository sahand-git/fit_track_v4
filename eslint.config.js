// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='Alert'][callee.property.name='alert']",
          message: "Alert.alert is forbidden. Use useAppDialog() from src/components/dialogs/AppDialogProvider instead.",
        },
      ],
    },
  }
]);
