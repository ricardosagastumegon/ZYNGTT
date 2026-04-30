import { parseCFDI } from '../services/cfdi-parser.service';
import fs from 'fs';
import path from 'path';

const xmlPath = process.argv[2] ?? path.resolve(__dirname, '../../test-cfdi.xml');
const xml = fs.readFileSync(xmlPath, 'utf-8');
const result = parseCFDI(xml);
console.log(JSON.stringify(result, null, 2));
