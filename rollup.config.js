import {terser} from 'rollup-plugin-terser';

export default {
  input: 'src/main.js',
  output: [
    {
      file: 'index.cjs.js',
      format: 'cjs'
    },
    {
      file: 'pathfit.js',
      format: 'iife',
      name: 'Pathfit'
    },
    {
      file: 'pathfit.min.js',
      format: 'iife',
      name: 'Pathfit',
      plugins: [terser()]
    }
  ]
};