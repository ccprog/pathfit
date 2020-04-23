import commonjs from '@rollup/plugin-commonjs';
import {terser} from 'rollup-plugin-terser';
import pkg from "./package.json";

const banner =
`/*
 * ${pkg.name} v${pkg.version}
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * ${pkg.license} License
 */
`;

export default {
  input: 'src/main.js',
  output: [
    {
      file: 'pathfit.js',
      format: 'iife',
      name: 'Pathfit',
      banner
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