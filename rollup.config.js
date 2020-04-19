import commonjs from '@rollup/plugin-commonjs';
import {terser} from 'rollup-plugin-terser';

export default {
  input: 'src/main.js',
  output: [
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
  ],
  plugins: [commonjs()]
};