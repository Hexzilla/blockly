# @blockly/create-package [![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

A tool for creating a Blockly plugin based on a pre-existing template.

## Example Usage
```
npx @blockly/create-package my-plugin --type plugin
cd my-plugin
npm start
```

## Available templates
``--type field``: A field template.

``--type block``: A block template.

``--type theme``: A theme template.

``--type plugin``: A generic plugin template. (Default)

## Adding TypeScript
```
npx @blockly/create-package my-plugin --type plugin --typescript
```

## License

Apache 2.0
