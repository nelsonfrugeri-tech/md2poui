#! /usr/bin/env node
import yargs from 'yargs';
import * as fs from 'fs';

import md2poui from '..';
import { Options } from '../options';


const parser = yargs
  .locale('pt_BR')
  .command('$0 <srcPath> <destDir> [options]', 'Conversor de markdown para PO-UI', (args) => {
    return args
      .positional('srcPath', { describe: 'Caminho de origem dos arquivos markdown', type: 'string' })
      .positional('destDir', { describe: 'Diretório de destino dos componentes Angular', type: 'string' });
  })
  .options({
    exclusions: {
      describe: 'Lista dos arquivos/diretórios desconsiderados na conversão.',
      type: 'array'
    },
    highlightClassName: {
      describe: 'Nome da classe CSS utilizada nos elementos contendo códigos de exemplos.',
      type: 'string'
    },
    flatDirs: {
      describe: 'Cria todas as pastas de componentes na pasta raíz de destino.',
      type: 'boolean'
    },
    recursive: {
      describe: 'Lê recursivamente as pastas abaixo da pasta de origem.',
      type: 'boolean'
    },
    createHelpers: {
      describe: 'Cria os arquivos auxiliares de module, routing e service.',
      type: 'boolean'
    },
    home: {
      describe: 'Generate a home page with a menu for the generated components.',
      type: 'boolean'
    },
    moduleName: {
      describe: 'Nome do módulo Angular para agrupar os componentes.',
      type: 'string'
    },
    parentRoutePath: {
      describe: 'Caminho da rota pai utilizado para as rotas dos componentes.',
      type: 'string'
    },
    copyExternalFiles: {
      describe: 'Copia os arquivos externos referenciados nos arquivos markdown.',
      type: 'boolean'
    },
    resourceFolderName: {
      describe: 'Nome da pasta de armazenamento dos arquivos externos copiados.',
      type: 'string'
    },
    resourcePathName: {
      describe: 'Caminho utilizado para referenciar os arquivos externos nos componentes.',
      type: 'string'
    },
  })
  .help();

(async () => {
  const argv = await parser.argv;

  const srcPath = argv.srcPath as string;
  const destDir = argv.destDir as string;

  const options: Options = {};
  options.exclusions = argv.exclusions as string[];
  options.highlightClassName = argv.highlightClassName;
  options.flatDirs = argv.flatDirs;
  options.recursive = argv.recursive;
  options.createHelpers = argv.createHelpers;
  options.home = argv.home;
  options.moduleName = argv.moduleName;
  options.parentRoutePath = argv.parentRoutePath;
  options.copyExternalFiles = argv.copyExternalFiles;
  options.resourceFolderName = argv.resourceFolderName;
  options.resourcePathName = argv.resourcePathName;

  try {
    if (!srcPath || !destDir) {
      throw new Error('Source and destination arguments are required.');
    }
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Source path does not exist: ${srcPath}`);
    }
    if (fs.existsSync(destDir) && !fs.statSync(destDir).isDirectory()) {
      throw new Error(`Destination must be a directory: ${destDir}`);
    }
    md2poui(srcPath, destDir, options);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
})();
